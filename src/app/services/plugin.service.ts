import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Plugin} from '../models/plugin.interface';
import {ArtifactType} from "../models/artifact.interface";
import {environment} from "../../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class PluginService {

    private apiUrl = environment.climateActionApiUrl;

    constructor(private http: HttpClient) {}

    getPlugins(): Observable<Plugin[]> {
        return this.http.get<Plugin[]>(`${this.apiUrl}/plugin/`);
    }

    getPluginDetails(pluginName: string): Observable<Plugin> {
        return this.http.get<Plugin>(`${this.apiUrl}/plugin/${pluginName}` );
    }

    computePlugin(pluginId: string, params: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/plugin/${pluginId}`, params)
    }

    getArtifacts(id: string): Observable<Array<ArtifactType>> {
        return this.http.get<Array<ArtifactType>>(`${this.apiUrl}/store/${id}`)
    }

    getComputeIds(): string[] {
        let commaSeperatedCorrelationIDs: string | null = localStorage.getItem('correlation_id')
        let correlationIDs: string[] = []
        if (commaSeperatedCorrelationIDs) {
            correlationIDs = commaSeperatedCorrelationIDs.split(',')
        }
        return correlationIDs
    }

    storeComputeIds(id: string) {
        // store the correlation_uuid in localStorage
        let commaSeperatedCorrelationIDs: string | null = localStorage.getItem('correlation_id')
        let correlationIDs: string[] = []
        if (commaSeperatedCorrelationIDs) {
            correlationIDs = commaSeperatedCorrelationIDs.split(',')
        }
        correlationIDs.push(id)
        localStorage.setItem('correlation_id', correlationIDs.toString())
    }
}
