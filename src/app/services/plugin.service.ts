import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {Plugin, PluginRun} from '../models/plugin.interface';
import {ArtifactType} from "../models/artifact.interface";
import {environment} from "../../environments/environment";
import {RunsService} from "./runs.service";

@Injectable({
    providedIn: 'root'
})
export class PluginService {

    private apiUrl = environment.climateActionApiUrl;

    private pluginRuns: PluginRun[] = [];
    private pluginRunsSubject = new BehaviorSubject<PluginRun[]>(this.pluginRuns);

    constructor(private http: HttpClient) {
    }

    getPlugins(): Observable<Plugin[]> {
        return this.http.get<Plugin[]>(`${this.apiUrl}/plugin/`);
    }

    getPluginDetails(pluginName: string): Observable<Plugin> {
        return this.http.get<Plugin>(`${this.apiUrl}/plugin/${pluginName}`);
    }

    computePlugin(pluginId: string, params: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/plugin/${pluginId}`, params)
    }

    getArtifacts(id: string): Observable<Array<ArtifactType>> {
        return this.http.get<Array<ArtifactType>>(`${this.apiUrl}/store/${id}`)
    }

    getComputes(): Array<PluginRun> {
        let plugin_runs: string | null = localStorage.getItem('plugin_runs')
        if (!plugin_runs)
            return [];

        return JSON.parse(plugin_runs)
    }

    storeComputes(id: string, plugin: Plugin) {
        // store plugin run/commute info like correlation_id, plugin.plugin_id, plugin.name in a json format
        let runs = this.getComputes()
        let currentRunInfo = {
            correlation_id: id,
            pluginId: plugin.plugin_id,
            pluginName: plugin.name
        }
        runs.push(currentRunInfo)

        localStorage.setItem('plugin_runs', JSON.stringify(runs))
    }

    clearComputes() {
        localStorage.clear()
    }

    /**
     * Refreshes the localstorage with updated data
     * @param runs Plugin_runs[]
     */
    refreshCompute(runs: PluginRun[]) {
        this.clearComputes()
        localStorage.setItem('plugin_runs', JSON.stringify(runs))
    }

    getPluginRuns() {
        return this.pluginRunsSubject.asObservable();
    }

    updateRunStatus(correlationId: string, newStatus: 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'wrong-input') {
        let runs = this.getComputes()
        const index = runs.findIndex((run) => run.correlation_id === correlationId);

        if (index !== -1) {
            runs[index].status = newStatus;
            this.refreshCompute(runs)
            this.pluginRunsSubject.next([...runs]);
        }
    }
}
