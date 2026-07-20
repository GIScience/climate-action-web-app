import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { formatScheduleTitle, isWithinLookaheadWindow } from '@app/utils/schedule.utils'
import { environment } from '@environments/environment'
import { TranslocoService } from '@jsverse/transloco'
import { Observable, map, of } from 'rxjs'
import { StatusNotice } from './announcement.types'

export interface MaintenanceAnnouncement {
    maintenanceType: string
    impact: string
    downtimeStart?: string
    downtimeEnd: string
}

export interface ScheduleNotices {
    pinned: StatusNotice[]
    upcoming: StatusNotice[]
}

@Injectable({
    providedIn: 'root'
})
export class FallbackSchedulesService {
    private http = inject(HttpClient)
    private transloco = inject(TranslocoService)
    private documentUrl = environment.fallbackSchedulesUrl

    fetchActiveSchedules(): Observable<ScheduleNotices> {
        if (!this.documentUrl) return of({ pinned: [], upcoming: [] })
        return this.http.get<MaintenanceAnnouncement[]>(this.documentUrl).pipe(
            map(announcements => {
                const relevant = announcements.filter(item =>
                    isWithinLookaheadWindow(this.downtimeStart(item), this.downtimeEnd(item))
                )
                return {
                    pinned: relevant.filter(item => this.isInProgress(item)).map(item => this.toNotice(item)),
                    upcoming: relevant.filter(item => !this.isInProgress(item)).map(item => this.toNotice(item))
                }
            })
        )
    }

    // Gracefully handle schedules without a start time; i.e. treat them as upcoming.
    private isInProgress(item: MaintenanceAnnouncement): boolean {
        const start = this.downtimeStart(item)
        return !!start && start <= new Date()
    }

    private toNotice(item: MaintenanceAnnouncement): StatusNotice {
        return {
            level: 'info',
            title: formatScheduleTitle(
                item.maintenanceType || '',
                this.transloco.getActiveLang(),
                this.downtimeStart(item),
                this.downtimeEnd(item)
            ),
            message: item.impact
        }
    }

    private downtimeStart(item: MaintenanceAnnouncement): Date | undefined {
        return item.downtimeStart ? new Date(item.downtimeStart) : undefined
    }

    private downtimeEnd(item: MaintenanceAnnouncement): Date {
        return new Date(item.downtimeEnd)
    }
}
