import {Injectable} from '@angular/core'
import {HttpClient} from '@angular/common/http'
import {BehaviorSubject, Observable} from 'rxjs'
import {Plugin, PluginCorrelator, PluginRun} from '../plugin/plugin.interface'
import {Artifact} from '../artifact/artifact.interface'
import {environment} from '../../environments/environment'
import moment from 'moment/moment';

@Injectable({
    providedIn: 'root'
})
export class PluginService {

    private apiUrl = environment.climateActionApiUrl

    private pluginRuns: PluginRun[] = []
    private pluginRunsSubject = new BehaviorSubject<PluginRun[]>(this.pluginRuns)

    constructor(private http: HttpClient) {
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

    getArtifacts(id: string): Observable<Array<Artifact>> {
        return this.http.get<Array<Artifact>>(`${this.apiUrl}/api/v1/gateway/store/${id}`)
    }

    getComputes(): Array<PluginRun> {
        const plugin_runs: string | null = localStorage.getItem('plugin_runs')
        if (!plugin_runs)
            return []

        return JSON.parse(plugin_runs)
    }

    storeComputes(id: string, plugin: Plugin) {
        const runs: Array<PluginRun> = this.getComputes()
        const currentRunInfo = {
            correlation_uuid: id,
            pluginId: plugin.plugin_id,
            pluginName: plugin.name,
            timestamp: moment().format()
        }
        runs.push(currentRunInfo)

        localStorage.setItem('plugin_runs', JSON.stringify(runs))
    }

    /**
     * Refreshes the localstorage with updated data
     * @param runs Plugin_runs[]
     */
    refreshCompute(runs: PluginRun[]) {
        localStorage.setItem('plugin_runs', JSON.stringify(runs))
    }

    getPluginRuns() {
        return this.pluginRunsSubject.asObservable()
    }

    updateRunStatus(correlationId: string, newStatus: 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'wrong-input') {
        const runs = this.getComputes()
        const index = runs.findIndex((run) => run.correlation_uuid === correlationId)

        if (index !== -1) {
            runs[index].status = newStatus
            this.refreshCompute(runs)
            this.pluginRunsSubject.next([...runs])
        }
    }
}
