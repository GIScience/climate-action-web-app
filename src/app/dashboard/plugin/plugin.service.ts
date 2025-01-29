import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs'
import { catchError, concatMap, delay, retryWhen, timeout } from 'rxjs/operators'
import { environment } from '../../../environments/environment'
import { RunStatus } from '../common/status.types'
import { ComputationEntity, ComputationID, ComputationMetadata } from '../computations-index/computation.interface'
import { ComputeState, Plugin } from './plugin.interface'

@Injectable({
    providedIn: 'root'
})
export class PluginService {
    private apiUrl = environment.climateActionApiUrl

    private pluginRuns: ComputationEntity[] = []
    private pluginRunsSubject = new BehaviorSubject<ComputationEntity[]>(this.pluginRuns)

    private computeStateSubject = new BehaviorSubject<ComputeState>('inactive')
    private syncTasksSubject = new Subject<void>()

    public computeState$ = this.computeStateSubject.asObservable()
    public syncTasks$ = this.syncTasksSubject.asObservable()

    private catalogToggleInput!: HTMLInputElement

    constructor(private http: HttpClient) {}

    getIconUrl(pluginId: string, pluginVersion: string): string {
        return `${this.apiUrl}/api/v1/gateway/store/${pluginId}/icon?plugin_version=${pluginVersion}`
    }

    getPlugins(): Observable<Plugin[]> {
        return this.http.get<Plugin[]>(`${this.apiUrl}/api/v1/gateway/plugin/`)
    }

    getPluginDetails(pluginName: string): Observable<Plugin> {
        return this.http.get<Plugin>(`${this.apiUrl}/api/v1/gateway/plugin/${pluginName}`)
    }

    computePlugin(pluginId: string, params: object): Observable<ComputationID> {
        return this.http.post<ComputationID>(`${this.apiUrl}/api/v1/gateway/plugin/${pluginId}`, params)
    }

    getComputationState(id: string): Observable<RunStatus> {
        return this.http.get<RunStatus>(`${this.apiUrl}/api/v1/gateway/computation/${id}/state`)
    }

    getComputationMetadata(id: string): Observable<ComputationMetadata> {
        const requestTimeout = 5000
        const maxRetries = 3
        return this.http.get<ComputationMetadata>(`${this.apiUrl}/api/v1/gateway/store/${id}/metadata/`).pipe(
            timeout(requestTimeout),
            retryWhen(errors =>
                errors.pipe(
                    concatMap((error, index) => {
                        if (index < maxRetries) {
                            console.warn(`Retrying request for computation ${id} (${index + 1})...`)
                            return of(error).pipe(delay((index + 1) * 1000))
                        }
                        return throwError(
                            () => `Error fetching computation ${id} after several retries: ${error.message}`
                        )
                    })
                )
            ),
            catchError(error => {
                console.error(`Error fetching computation ${id}:`, error)
                return throwError(() => error)
            })
        )
    }

    setCatalogToggleInput(input: HTMLInputElement) {
        this.catalogToggleInput = input
    }

    openPluginCatalog() {
        if (this.catalogToggleInput && this.catalogToggleInput.checked) {
            this.catalogToggleInput.checked = false
        }
    }

    collapsePluginCatalog() {
        if (this.catalogToggleInput && !this.catalogToggleInput.checked) {
            this.catalogToggleInput.checked = true
        }
    }

    getComputesFromLS(status: RunStatus[]): ComputationEntity[] {
        const plugin_runs: string | null = localStorage.getItem('plugin_runs')
        if (!plugin_runs) return []

        const parsed_runs: ComputationEntity[] = JSON.parse(plugin_runs)
        return parsed_runs.filter(run => status.includes(run.status as RunStatus))
    }

    setComputeState(computeState: ComputeState): void {
        this.computeStateSubject.next(computeState)
    }

    getComputeState(): Observable<ComputeState> {
        return this.computeState$
    }

    storeNewComputes(id: string, plugin: Plugin, aoiName?: string) {
        const runs: Array<ComputationEntity> = this.getComputesFromLS(['PENDING', 'STARTED', 'SUCCESS'])
        const currentRunInfo = {
            correlation_uuid: id,
            pluginId: plugin.plugin_id,
            pluginName: plugin.name,
            timestamp: new Date(),
            status: 'PENDING' as RunStatus,
            aoiName: aoiName
        }
        runs.push(currentRunInfo as ComputationEntity)

        this.refreshComputesInLS(runs)
        this.pluginRunsSubject.next([...runs])
    }

    refreshComputesInLS(runs: ComputationEntity[]) {
        localStorage.setItem('plugin_runs', JSON.stringify(runs))
    }

    getPluginRuns() {
        return this.pluginRunsSubject.asObservable()
    }

    updateRunStatus(correlationId: string, newStatus: RunStatus) {
        const runs = this.getComputesFromLS(['PENDING', 'STARTED', 'SUCCESS'])
        const index = runs.findIndex(run => run.correlation_uuid === correlationId)

        if (index !== -1) {
            runs[index].status = newStatus
            this.refreshComputesInLS(runs)
            this.pluginRunsSubject.next([...runs])
        }
    }

    triggerSyncTasks() {
        this.syncTasksSubject.next()
    }
}
