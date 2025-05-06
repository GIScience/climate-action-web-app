import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from '@environments/environment'
import { Feature } from 'ol'
import GeoJSON from 'ol/format/GeoJSON'
import { MultiPolygon } from 'ol/geom'
import { BehaviorSubject, map, Observable, of, Subject, throwError } from 'rxjs'
import { catchError, concatMap, delay, retryWhen, timeout } from 'rxjs/operators'
import { StorageService } from '../../storage.service'
import { ComputationState, ComputationStateInfo } from '../common/status.types'
import {
    ComputationDatabaseEntity,
    ComputationDisplayEntity,
    ComputationID,
    ComputationMetadata
} from '../computations-index/computation.interface'
import { ComputeState, Plugin } from './plugin.interface'

@Injectable({
    providedIn: 'root'
})
export class PluginService {
    private apiUrl = environment.climateActionApiUrl

    private pluginRuns: ComputationDisplayEntity[] = []
    private pluginRunsSubject = new BehaviorSubject<ComputationDisplayEntity[]>(this.pluginRuns)

    private computeStateSubject = new BehaviorSubject<ComputeState>('inactive')
    private syncTasksSubject = new Subject<void>()

    public computeState$ = this.computeStateSubject.asObservable()
    public syncTasks$ = this.syncTasksSubject.asObservable()

    private catalogToggleInput!: HTMLInputElement

    constructor(
        private http: HttpClient,
        private storageService: StorageService
    ) {}

    getIconUrl(pluginId: string) {
        return `${this.apiUrl}/api/v1/gateway/store/${pluginId}/icon`
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

    computeDemo(pluginId: string): Observable<ComputationID> {
        return this.http.get<ComputationID>(`${this.apiUrl}/api/v1/gateway/plugin/${pluginId}/demo`)
    }

    getComputationState(id: string): Observable<ComputationStateInfo> {
        return this.http.get<ComputationStateInfo>(`${this.apiUrl}/api/v1/gateway/computation/${id}/state`)
    }

    getComputationMetadata(id: string): Observable<ComputationMetadata> {
        const gj = new GeoJSON()
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
            }),
            map((metadata: ComputationMetadata) => {
                const feat = gj.readFeature(metadata.aoi, { featureProjection: 'EPSG:3857' }) as Feature<MultiPolygon>
                feat.set('renderStyle', 'AOI')
                metadata.aoi = feat
                return metadata
            })
        )
    }

    setCatalogToggleInput(input: HTMLInputElement) {
        this.catalogToggleInput = input
    }

    collapsePluginCatalog() {
        if (this.catalogToggleInput && !this.catalogToggleInput.checked) {
            this.catalogToggleInput.checked = true
        }
    }

    setComputeState(computeState: ComputeState): void {
        this.computeStateSubject.next(computeState)
    }

    getComputeState(): Observable<ComputeState> {
        return this.computeState$
    }

    storeNewComputes(id: string, pluginId: string, aoiName?: string) {
        const compute: ComputationDatabaseEntity = {
            correlation_uuid: id,
            pluginId: pluginId,
            timestamp: new Date(),
            status: 'PENDING' as ComputationState,
            aoiName: aoiName
        }

        this.storageService.storeNewCompute(compute)

        const runs = this.storageService.getPluginRuns()
        this.pluginRunsSubject.next([...runs] as ComputationDisplayEntity[])
    }

    refreshComputesInLS(runs: ComputationDatabaseEntity[]) {
        this.storageService.savePluginRuns(runs)
    }

    getPluginRuns() {
        return this.storageService.getPluginRunsObservable()
    }

    updateRunStatus(correlationId: string, newStatus: ComputationState) {
        this.storageService.updateComputeStatus(correlationId, newStatus)

        const runs = this.storageService.getPluginRuns()
        this.pluginRunsSubject.next([...runs] as ComputationDisplayEntity[])
    }

    triggerSyncTasks() {
        this.syncTasksSubject.next()
    }
}
