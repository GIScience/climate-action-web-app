import { inject, Injectable, OnDestroy } from '@angular/core'
import { Observable, Subject, Subscription, timer } from 'rxjs'
import { PluginService } from '../plugin/plugin.service'
import { ComputationDatabaseEntity } from './computation.interface'

export interface RunStateTransition {
    run: ComputationDatabaseEntity
    newStatus: 'STARTED' | 'SUCCESS' | 'FAILURE'
    message?: string
}

@Injectable()
export class ComputationSyncService implements OnDestroy {
    private pluginService = inject(PluginService)

    private readonly POLL_INTERVAL = 5000
    private readonly MAX_INTERVAL = 1800000

    private transitions = new Subject<RunStateTransition>()
    readonly transitions$: Observable<RunStateTransition> = this.transitions.asObservable()

    private getPendingRuns: () => ComputationDatabaseEntity[] = () => []
    private timerSub?: Subscription
    private visibilityChangeHandler?: () => void

    start(getPendingRuns: () => ComputationDatabaseEntity[]): void {
        this.getPendingRuns = getPendingRuns

        if (!this.visibilityChangeHandler) {
            this.visibilityChangeHandler = () => {
                if (!document.hidden && this.getPendingRuns().length > 0 && (!this.timerSub || this.timerSub.closed)) {
                    this.checkAndScheduleNext()
                }
            }
            document.addEventListener('visibilitychange', this.visibilityChangeHandler)
        }

        if (this.timerSub && !this.timerSub.closed) return

        this.checkAndScheduleNext()
    }

    stop(): void {
        if (this.timerSub) {
            this.timerSub.unsubscribe()
            this.timerSub = undefined
        }
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
            this.visibilityChangeHandler = undefined
        }
    }

    ngOnDestroy(): void {
        this.stop()
        this.transitions.complete()
    }

    private checkAndScheduleNext(): void {
        const pendingRuns = this.getPendingRuns()
        const hasPendingRuns = pendingRuns.length > 0

        const now = Date.now()
        const allExceededMaxInterval =
            hasPendingRuns &&
            pendingRuns.every(run => {
                const runTs = new Date(run.request_ts).getTime()
                return now - runTs >= this.MAX_INTERVAL
            })

        if (hasPendingRuns && !allExceededMaxInterval) {
            this.runSync()
            this.timerSub = timer(this.POLL_INTERVAL).subscribe(() => this.checkAndScheduleNext())
        } else {
            if (allExceededMaxInterval) {
                this.runSync()
            }
            if (this.timerSub) {
                this.timerSub.unsubscribe()
                this.timerSub = undefined
            }
        }
    }

    private runSync(): void {
        this.getPendingRuns().forEach(run => {
            this.pluginService.getComputationRunState(run.correlation_uuid).subscribe({
                next: stateInfo => {
                    switch (stateInfo.state) {
                        case 'STARTED':
                            this.transitions.next({ run, newStatus: 'STARTED' })
                            break
                        case 'SUCCESS':
                            this.transitions.next({ run, newStatus: 'SUCCESS' })
                            break
                        case 'FAILURE':
                            this.transitions.next({ run, newStatus: 'FAILURE', message: stateInfo.message })
                            break
                        case 'PENDING':
                        default:
                            break
                    }
                },
                error: error => {
                    console.error('Error checking state for run:', run.correlation_uuid, error)
                }
            })
        })
    }
}
