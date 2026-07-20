import { HttpClient } from '@angular/common/http'
import { Injectable, inject, signal } from '@angular/core'
import { formatScheduleTitle, isWithinLookaheadWindow } from '@app/utils/schedule.utils'
import { environment } from '@environments/environment'
import { TranslocoService } from '@jsverse/transloco'
import { ToastrService } from 'ngx-toastr'
import { EMPTY, Observable, catchError, concat, retry, tap, timeout } from 'rxjs'
import { StatusNotice, ToastLevel } from './announcement.types'
import {
    CachetAnnouncement,
    CachetComponent,
    CachetIncident,
    CachetIncluded,
    CachetListResponse,
    CachetSchedule,
    IncidentStatus,
    ScheduleStatus
} from './cachet.types'
import { FallbackSchedulesService } from './fallback-schedules.service'

const ACTIVE_SCHEDULE_STATUSES = [ScheduleStatus.Upcoming, ScheduleStatus.InProgress]
const ACTIVE_INCIDENT_STATUSES = [
    IncidentStatus.Reported,
    IncidentStatus.Investigating,
    IncidentStatus.Identified,
    IncidentStatus.Watching
]

// Joins a component's name and its parent group's name into a single key for watchlist lookups.
const componentKey = (component: string, group: string) => `${group.trim()}\0${component.trim()}`

const WATCHED_COMPONENT_KEYS = new Set(
    environment.cachetWatchedComponents
        .split(',')
        .map(entry => entry.split(':'))
        .filter(parts => parts.length === 2 && parts[0].trim() && parts[1].trim())
        .map(([group, component]) => componentKey(component, group))
)

// Cachet's rate-limiter increments a counter in its (SQLite) cache on every request, which can
// throw random "database is locked" 500s under concurrency — a brief retry rides those out.
const RETRY_COUNT = 2
const RETRY_DELAY_MS = 400
const REQUEST_TIMEOUT_MS = 5000

@Injectable({
    providedIn: 'root'
})
export class StatusAnnouncementsService {
    private http = inject(HttpClient)
    private toastr = inject(ToastrService)
    private transloco = inject(TranslocoService)
    private fallbackSchedules = inject(FallbackSchedulesService)
    private cachetUrl = environment.cachetUrl

    readonly notices = signal<StatusNotice[]>([])

    showActiveAnnouncements(): void {
        this.notices.set([])
        concat(this.fetchSchedules(), this.fetchIncidents()).subscribe()
    }

    private fetchSchedules(): Observable<unknown> {
        return this.queryCachet<CachetSchedule>(
            'schedules',
            'Failed to load maintenance schedules:',
            ACTIVE_SCHEDULE_STATUSES,
            () => 'info',
            () => undefined,
            schedule => this.scheduleTitle(schedule),
            schedule => this.isScheduleRelevant(schedule),
            schedule => schedule.attributes.status.value === ScheduleStatus.InProgress,
            () => this.fetchFallbackSchedules()
        )
    }

    // When Cachet itself is unreachable, fall back to the static maintenance-schedule document.
    private fetchFallbackSchedules(): Observable<unknown> {
        return this.fallbackSchedules.fetchActiveSchedules().pipe(
            tap(({ pinned, upcoming }) => {
                upcoming.forEach(notice => this.showToast(notice))
                if (pinned.length) this.notices.update(current => [...current, ...pinned])
            }),
            catchError(err => {
                console.error('Failed to load fallback maintenance schedules:', err)
                return EMPTY
            })
        )
    }

    private fetchIncidents(): Observable<unknown> {
        return this.queryCachet<CachetIncident>(
            'incidents',
            'Failed to load incidents:',
            ACTIVE_INCIDENT_STATUSES,
            incident => this.incidentLevel(incident.attributes.status.value),
            incident => `${this.cachetUrl}/incidents/${incident.attributes.guid}`
        )
    }

    private queryCachet<T extends CachetAnnouncement>(
        path: string,
        errorMessage: string,
        activeStatuses: number[],
        level: (item: T) => ToastLevel,
        link: (item: T) => string | undefined = () => undefined,
        formatTitle: (item: T) => string = item => item.attributes.name,
        shouldShow: (item: T) => boolean = () => true,
        isPinned: (item: T) => boolean = () => true,
        fallback: () => Observable<unknown> = () => EMPTY
    ): Observable<unknown> {
        const url = `${this.cachetUrl}/api/${path}?include=components.group&filter[status]=${activeStatuses.join(',')}`
        return this.http.get<CachetListResponse<T>>(url).pipe(
            timeout(REQUEST_TIMEOUT_MS),
            retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
            tap(response => {
                const watchedIds = this.watchedComponentIds(response.included)
                const pinned: StatusNotice[] = []
                // Surface each item that is still active and references a watched component. Ongoing items
                // collect into the persistent notices banner; upcoming ones pop as a dismissable toast.
                response.data
                    .filter(item => activeStatuses.includes(item.attributes.status.value))
                    .filter(item => this.isForWatchedComponent(item, watchedIds))
                    .filter(item => shouldShow(item))
                    .forEach(item => {
                        const notice: StatusNotice = {
                            level: level(item),
                            title: formatTitle(item),
                            message: item.attributes.message,
                            link: link(item)
                        }
                        if (isPinned(item)) pinned.push(notice)
                        else this.showToast(notice)
                    })
                if (pinned.length) this.notices.update(current => [...current, ...pinned])
            }),
            catchError(err => {
                console.error(errorMessage, err)
                return fallback()
            })
        )
    }

    // Watching (3) is winding down → warning; Investigating (1) / Identified (2) → error.
    private incidentLevel(status: IncidentStatus): ToastLevel {
        return status === IncidentStatus.Watching ? 'warning' : 'error'
    }

    private scheduleTitle(item: CachetSchedule): string {
        const { start, end } = this.scheduleWindow(item)
        return formatScheduleTitle(item.attributes.name, this.transloco.getActiveLang(), start, end)
    }

    private isScheduleRelevant(item: CachetSchedule): boolean {
        const { start, end } = this.scheduleWindow(item)
        return isWithinLookaheadWindow(start, end)
    }

    private scheduleWindow(item: CachetSchedule): { start?: Date; end?: Date } {
        const { scheduled, completed } = item.attributes
        return {
            start: scheduled?.string ? this.toDate(scheduled.string) : undefined,
            end: completed?.string ? this.toDate(completed.string) : undefined
        }
    }

    // Normalise Cachet UTC timestamps to ISO-8601 format with 'Z' for instant parsing.
    private toDate(timestamp: string): Date {
        return new Date(`${timestamp.replace(' ', 'T')}Z`)
    }

    // Resolves each included component to its (group, name) pair and keeps the ids whose pair is watched.
    private watchedComponentIds(included?: CachetIncluded[]): Set<string> {
        const records = included ?? []
        const groupNames = new Map(
            records
                .filter(record => record.type === 'componentGroups')
                .map(group => [group.id, group.attributes.name] as [string, string])
        )
        return new Set(
            records
                .filter((record): record is CachetComponent => record.type === 'components')
                .filter(component => {
                    const groupId = component.relationships?.group?.data?.id
                    const groupName = groupId && groupNames.get(groupId)
                    return !!groupName && WATCHED_COMPONENT_KEYS.has(componentKey(component.attributes.name, groupName))
                })
                .map(component => component.id)
        )
    }

    // True when the announcement references at least one of the watched components.
    private isForWatchedComponent(item: CachetAnnouncement, watchedIds: Set<string>): boolean {
        const componentRefs = item.relationships?.components?.data ?? []
        return componentRefs.some(ref => watchedIds.has(ref.id))
    }

    // Upcoming maintenance is a dismissable heads-up toast at the top of the screen.
    private showToast({ level, title, message }: StatusNotice): void {
        this.toastr[level](message, title || '', {
            toastClass: 'ngx-toastr ngx-toastr--inverted',
            positionClass: 'toast-top-center',
            disableTimeOut: true,
            closeButton: true,
            tapToDismiss: true
        })
    }
}
