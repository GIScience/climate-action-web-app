import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { environment } from '@environments/environment'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { ToastrService } from 'ngx-toastr'
import { MockToastrService } from '../../../../jest.mocks'
import { StatusAnnouncementsService } from './status-announcements.service'

const groupRef = (id: string) => ({ relationships: { group: { data: { type: 'componentGroups', id } } } })

// Default watchlist (from environment.ts) is the pair "Climate Action: Climate Action Navigator".
const watchedGroup = { id: '10', type: 'componentGroups', attributes: { id: 10, name: 'Climate Action' } }
const watchedComponent = {
    id: '108',
    type: 'components',
    attributes: { id: 108, name: 'Climate Action Navigator', status: { human: 'Operational', value: 1 } },
    ...groupRef('10')
}
const otherGroup = { id: '20', type: 'componentGroups', attributes: { id: 20, name: 'Other Systems' } }
const unwatchedComponent = {
    id: '200',
    type: 'components',
    attributes: { id: 200, name: 'Some Other Component', status: { human: 'Operational', value: 1 } },
    ...groupRef('20')
}
// Same component name as the watched one, but under an unwatched group → must NOT match (strict pairing).
const sameNameOtherGroup = {
    id: '109',
    type: 'components',
    attributes: { id: 109, name: 'Climate Action Navigator', status: { human: 'Operational', value: 1 } },
    ...groupRef('20')
}
const componentRef = (id: string) => ({ relationships: { components: { data: [{ type: 'components', id }] } } })

describe('StatusAnnouncementsService', () => {
    let service: StatusAnnouncementsService
    let httpMock: HttpTestingController
    let toastr: MockToastrService

    const schedulesUrl = `${environment.cachetUrl}/api/schedules?include=components.group&filter[status]=0,1`
    const incidentsUrl = `${environment.cachetUrl}/api/incidents?include=components.group&filter[status]=0,1,2,3`

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                TranslocoTestingModule.forRoot({ langs: { en: {}, de: {} }, translocoConfig: { defaultLang: 'en' } })
            ],
            providers: [StatusAnnouncementsService, { provide: ToastrService, useClass: MockToastrService }]
        })
        service = TestBed.inject(StatusAnnouncementsService)
        httpMock = TestBed.inject(HttpTestingController)
        toastr = TestBed.inject(ToastrService) as unknown as MockToastrService
    })

    afterEach(() => {
        httpMock.verify()
        jest.useRealTimers()
    })

    it('toasts upcoming schedules at the top and pins ongoing ones to the bottom, skipping the rest', () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-06-16T00:00:00'))

        service.showActiveAnnouncements()

        httpMock.expectOne(schedulesUrl).flush({
            data: [
                {
                    id: '1',
                    type: 'schedules',
                    attributes: {
                        id: 1,
                        name: 'DB upgrade',
                        message: 'Brief downtime expected',
                        status: { human: 'Upcoming', value: 0 },
                        scheduled: { human: '4 days from now', string: '2026-06-20 06:30:00' },
                        completed: { human: '4 days from now', string: '2026-06-20 10:30:00' }
                    },
                    ...componentRef('108')
                },
                {
                    id: '2',
                    type: 'schedules',
                    attributes: {
                        id: 2,
                        name: 'Completed work',
                        message: 'Already finished',
                        status: { human: 'Complete', value: 2 } // → skipped
                    },
                    ...componentRef('108')
                },
                {
                    id: '3',
                    type: 'schedules',
                    attributes: {
                        id: 3,
                        name: 'Unwatched system',
                        message: 'Not our concern',
                        status: { human: 'Upcoming', value: 0 }
                    },
                    ...componentRef('200') // not watched → skipped
                },
                {
                    id: '4',
                    type: 'schedules',
                    attributes: {
                        id: 4,
                        name: 'Live migration',
                        message: 'Work underway',
                        status: { human: 'In Progress', value: 1 }
                    },
                    ...componentRef('108')
                },
                {
                    id: '5',
                    type: 'schedules',
                    attributes: {
                        id: 5,
                        name: 'Future rollout',
                        message: 'Still weeks away',
                        status: { human: 'Upcoming', value: 0 },
                        scheduled: { human: '2 weeks from now', string: '2026-07-01 09:00:00' } // > 7 days out → skipped
                    },
                    ...componentRef('108')
                },
                {
                    id: '6',
                    type: 'schedules',
                    attributes: {
                        id: 6,
                        name: 'Stale window',
                        message: 'Window already ended',
                        status: { human: 'In Progress', value: 1 }, // not yet flipped to Complete...
                        scheduled: { human: '6 days ago', string: '2026-06-10 06:30:00' },
                        completed: { human: '6 days ago', string: '2026-06-10 08:30:00' } // ...but past its end → skipped
                    },
                    ...componentRef('108')
                },
                {
                    id: '7',
                    type: 'schedules',
                    attributes: {
                        id: 7,
                        name: 'Open-ended window',
                        message: 'No end time set',
                        status: { human: 'Upcoming', value: 0 },
                        scheduled: { human: '4 days from now', string: '2026-06-20 06:30:00' },
                        completed: { human: null, string: null } // present but unset until it ends → shown
                    },
                    ...componentRef('108')
                },
                {
                    id: '8',
                    type: 'schedules',
                    attributes: {
                        id: 8,
                        name: 'Right name, wrong group',
                        message: 'Should not surface',
                        status: { human: 'Upcoming', value: 0 },
                        scheduled: { human: '4 days from now', string: '2026-06-20 06:30:00' }
                    },
                    ...componentRef('109') // watched name but unwatched group → skipped (strict pairing)
                }
            ],
            included: [watchedGroup, watchedComponent, otherGroup, unwatchedComponent, sameNameOtherGroup]
        })
        httpMock.expectOne(incidentsUrl).flush({ data: [] })

        // Only the two upcoming schedules pop as dismissable toasts; the ongoing one becomes a notice.
        expect(toastr.info).toHaveBeenCalledTimes(2)
        // Upcoming (id1): dismissable toast at the top.
        expect(toastr.info).toHaveBeenCalledWith(
            'Brief downtime expected',
            expect.stringMatching(/^DB upgrade \(Jun 20, 2026, 6:30\sAM → Jun 20, 2026, 10:30\sAM\)$/),
            expect.objectContaining({
                toastClass: 'ngx-toastr ngx-toastr--inverted',
                positionClass: 'toast-top-center',
                tapToDismiss: true
            })
        )
        // Upcoming with no end time yet (id7): still shown, title carries just the start.
        expect(toastr.info).toHaveBeenCalledWith(
            'No end time set',
            expect.stringMatching(/^Open-ended window \(Jun 20, 2026, 6:30\sAM\)$/),
            expect.objectContaining({ positionClass: 'toast-top-center', tapToDismiss: true })
        )
        // In progress (id4): not a toast — surfaced in the persistent notices section instead.
        expect(service.notices()).toEqual([{ level: 'info', title: 'Live migration', message: 'Work underway' }])
    })

    it('maps incident status to a toast level and skips fixed incidents', () => {
        service.showActiveAnnouncements()

        httpMock.expectOne(schedulesUrl).flush({ data: [] })
        httpMock.expectOne(incidentsUrl).flush({
            data: [
                {
                    id: '1',
                    type: 'incidents',
                    attributes: {
                        id: 1,
                        guid: 'guid-1',
                        name: 'Investigating outage',
                        message: 'Looking into it',
                        status: { human: 'Investigating', value: 1 }, // → error
                        visible: true
                    },
                    ...componentRef('108')
                },
                {
                    id: '2',
                    type: 'incidents',
                    attributes: {
                        id: 2,
                        guid: 'guid-2',
                        name: 'Monitoring fix',
                        message: 'Watching recovery',
                        status: { human: 'Watching', value: 3 }, // → warning
                        visible: true
                    },
                    ...componentRef('108')
                },
                {
                    id: '3',
                    type: 'incidents',
                    attributes: {
                        id: 3,
                        name: 'Resolved incident',
                        message: 'All good',
                        status: { human: 'Fixed', value: 4 } // → skipped
                    },
                    ...componentRef('108')
                }
            ],
            included: [watchedGroup, watchedComponent]
        })

        // Incidents are always ongoing → they land in the persistent notices section, never as toasts.
        expect(toastr.error).not.toHaveBeenCalled()
        expect(toastr.warning).not.toHaveBeenCalled()
        expect(service.notices()).toEqual([
            {
                level: 'error',
                title: 'Investigating outage',
                message: 'Looking into it',
                link: `${environment.cachetUrl}/incidents/guid-1`
            },
            {
                level: 'warning',
                title: 'Monitoring fix',
                message: 'Watching recovery',
                link: `${environment.cachetUrl}/incidents/guid-2`
            }
        ])
    })

    it('retries a transient failure and still surfaces the announcements on success', fakeAsync(() => {
        service.showActiveAnnouncements()

        httpMock.expectOne(schedulesUrl).flush('database is locked', { status: 500, statusText: 'Server Error' })
        tick(500) // advance past the retry backoff
        httpMock.expectOne(schedulesUrl).flush({
            data: [
                {
                    id: '1',
                    type: 'schedules',
                    attributes: {
                        id: 1,
                        name: 'DB upgrade',
                        message: 'Brief downtime expected',
                        status: { human: 'Upcoming', value: 0 }
                    },
                    ...componentRef('108')
                }
            ],
            included: [watchedGroup, watchedComponent]
        })

        httpMock.expectOne(incidentsUrl).flush('database is locked', { status: 500, statusText: 'Server Error' })
        tick(500) // advance past the retry backoff
        httpMock.expectOne(incidentsUrl).flush({
            data: [
                {
                    id: '1',
                    type: 'incidents',
                    attributes: {
                        id: 1,
                        guid: 'guid-1',
                        name: 'Investigating outage',
                        message: 'Looking into it',
                        status: { human: 'Investigating', value: 1 },
                        visible: true
                    },
                    ...componentRef('108')
                }
            ],
            included: [watchedGroup, watchedComponent]
        })

        // Upcoming schedule pops a toast; the ongoing incident surfaces as a notice.
        expect(toastr.info).toHaveBeenCalledTimes(1)
        expect(toastr.error).not.toHaveBeenCalled()
        expect(service.notices()).toEqual([
            {
                level: 'error',
                title: 'Investigating outage',
                message: 'Looking into it',
                link: `${environment.cachetUrl}/incidents/guid-1`
            }
        ])
    }))
})
