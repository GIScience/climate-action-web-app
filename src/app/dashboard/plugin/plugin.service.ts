import {Injectable} from '@angular/core'
import {HttpClient} from '@angular/common/http'
import {BehaviorSubject, Observable, of, Subject, throwError} from 'rxjs'
import {catchError, concatMap, delay, retryWhen, timeout} from 'rxjs/operators'
import {Plugin, PluginCorrelator, PluginRun, PluginState} from './plugin.interface'
import {RunStatus} from '../common/status.types'
import {ArtifactMetadata} from '../artifact/artifact.interface'
import {environment} from '../../../environments/environment'

@Injectable({
    providedIn: 'root'
})
export class PluginService {

    private apiUrl = environment.climateActionApiUrl

    private pluginRuns: PluginRun[] = []
    private pluginRunsSubject = new BehaviorSubject<PluginRun[]>(this.pluginRuns)

    private pluginStateSubject = new BehaviorSubject<PluginState>('inactive')
    private resetZoomSubject = new Subject<void>()
    private collapseComputationsSubject = new Subject<void>()

    public pluginState$ = this.pluginStateSubject.asObservable()
    public resetZoom$ = this.resetZoomSubject.asObservable()
    public collapseComputations$ = this.collapseComputationsSubject.asObservable()

    private catalogToggleInput!: HTMLInputElement

    constructor(private http: HttpClient) {
    }

    getIconUrl(pluginId: string, pluginVersion: string): string {
        return `${this.apiUrl}/api/v1/gateway/store/${pluginId}/icon?plugin_version=${pluginVersion}`
    }

    getPlugins(): Observable<Plugin[]> {
        return this.http.get<Plugin[]>(`${this.apiUrl}/api/v1/gateway/plugin/`)
    }

    getPluginDetails(pluginName: string): Observable<Plugin> {
        return this.http.get<Plugin>(`${this.apiUrl}/api/v1/gateway/plugin/${pluginName}`)
    }

    computePlugin(pluginId: string, params: object): Observable<PluginCorrelator> {
        return this.http.post<PluginCorrelator>(`${this.apiUrl}/api/v1/gateway/plugin/${pluginId}`, params)
    }

    getArtifactsMetadata(id: string): Observable<ArtifactMetadata> {
        const requestTimeout = 5000
        const maxRetries = 3
        return this.http.get<ArtifactMetadata>(`${this.apiUrl}/api/v1/gateway/store/${id}/metadata/`).pipe(
            timeout(requestTimeout),
            retryWhen(errors =>
                errors.pipe(
                    concatMap((error, index) => {
                        if (index < maxRetries) {
                            console.warn(`Retrying request for artifact ${id} (${index + 1})...`)
                            return of(error).pipe(delay((index + 1) * 1000))
                        }
                        return throwError(() => `Error fetching artifact ${id} after several retries: ${error.message}`)
                    })
                )
            ),
            catchError(error => {
                console.error(`Error fetching artifact ${id}:`, error)
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

    closePluginCatalog() {
        if (this.catalogToggleInput && !this.catalogToggleInput.checked) {
            this.catalogToggleInput.checked = true
        }
    }

    getComputes(): PluginRun[] {
        const plugin_runs: string | null = localStorage.getItem('plugin_runs')
        if (!plugin_runs)
            return []

        return JSON.parse(plugin_runs)
    }

    getScheduledRuns(): PluginRun[] {
        const plugin_runs: string | null = localStorage.getItem('plugin_runs')
        if (!plugin_runs)
            return []

        const scheduled_runs: PluginRun[] = JSON.parse(plugin_runs)
        return scheduled_runs.filter(run => run.status === 'scheduled')
    }

    setPluginState(pluginState: PluginState): void {
        this.pluginStateSubject.next(pluginState)
        if (pluginState === 'compute-ready') {
            this.resetZoomSubject.next()
            this.collapseComputationsSubject.next()
        }
    }

    getPluginState(): Observable<PluginState> {
        return this.pluginState$
    }

    storeNewComputes(id: string, plugin: Plugin, aoiName?: string) {
        const runs: Array<PluginRun> = this.getComputes()
        const currentRunInfo = {
            correlation_uuid: id,
            pluginId: plugin.plugin_id,
            pluginName: plugin.name,
            timestamp: new Date(),
            status: 'scheduled' as RunStatus,
            aoiName: aoiName
        }
        runs.push(currentRunInfo)

        localStorage.setItem('plugin_runs', JSON.stringify(runs))
        this.pluginRunsSubject.next([...runs])
    }

    refreshCompute(runs: PluginRun[]) {
        localStorage.setItem('plugin_runs', JSON.stringify(runs))
    }

    getPluginRuns() {
        return this.pluginRunsSubject.asObservable()
    }

    updateRunStatus(correlationId: string, newStatus: RunStatus) {
        const runs = this.getComputes()
        const index = runs.findIndex((run) => run.correlation_uuid === correlationId)

        if (index !== -1) {
            runs[index].status = newStatus
            this.refreshCompute(runs)
            this.pluginRunsSubject.next([...runs])
        }
    }
}
