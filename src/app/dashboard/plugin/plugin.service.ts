import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from '@environments/environment'
import { Feature } from 'ol'
import GeoJSON from 'ol/format/GeoJSON'
import { MultiPolygon } from 'ol/geom'
import { BehaviorSubject, Observable, Subject, map, of, throwError } from 'rxjs'
import { catchError, concatMap, delay, retryWhen, tap, timeout } from 'rxjs/operators'
import { StorageService } from '../../storage.service'
import { ComputationRunState, ComputationRunStateInfo } from '../common/status.types'
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

    private metadataCache = new Map<string, { data: ComputationMetadata; timestamp: number }>()
    private readonly METADATA_CACHE_TTL = 60 * 60 * 1000 // 1 hour

    constructor(
        private http: HttpClient,
        private storageService: StorageService
    ) {}

    getIconUrl(pluginId: string) {
        return `${this.apiUrl}/store/${pluginId}/icon`
    }

    getPlugins(): Observable<Plugin[]> {
        return this.http.get<Plugin[]>(`${this.apiUrl}/plugin`)
    }

    getPluginDetails(pluginName: string): Observable<Plugin> {
        return this.http.get<Plugin>(`${this.apiUrl}/plugin/${pluginName}`)
    }

    computePlugin(pluginId: string, params: object): Observable<ComputationID> {
        return this.http.post<ComputationID>(`${this.apiUrl}/plugin/${pluginId}`, params)
    }

    computeDemo(pluginId: string): Observable<ComputationID> {
        return this.http.get<ComputationID>(`${this.apiUrl}/plugin/${pluginId}/demo`)
    }

    getComputationRunState(id: string): Observable<ComputationRunStateInfo> {
        return this.http.get<ComputationRunStateInfo>(`${this.apiUrl}/computation/${id}/state`)
    }

    getComputationMetadata(id: string): Observable<ComputationMetadata> {
        const cached = this.metadataCache.get(id)
        if (cached && Date.now() - cached.timestamp < this.METADATA_CACHE_TTL) {
            return of(cached.data)
        }

        const gj = new GeoJSON()
        const requestTimeout = 5000
        const maxRetries = 3
        return this.http.get<ComputationMetadata>(`${this.apiUrl}/store/${id}/metadata`).pipe(
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
                const feat = gj.readFeature(metadata.aoi, {
                    featureProjection: 'EPSG:3857'
                }) as Feature<MultiPolygon>
                feat.set('renderStyle', 'AOI')
                metadata.aoi = feat
                return metadata
            }),
            tap(metadata => {
                this.metadataCache.set(id, { data: metadata, timestamp: Date.now() })
            })
        )
    }

    setCatalogToggleInput(input: HTMLInputElement) {
        this.catalogToggleInput = input
    }

    expandPluginCatalog() {
        if (this.catalogToggleInput && this.catalogToggleInput.checked) {
            this.catalogToggleInput.checked = false
        }
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

    storeNewComputes(compute: ComputationDatabaseEntity) {
        this.storageService.storeNewCompute(compute)

        const runs = this.storageService.getPluginRuns()
        this.pluginRunsSubject.next([...runs] as ComputationDisplayEntity[])
    }

    getPluginRuns() {
        return this.storageService.getPluginRunsObservable()
    }

    async updateRunStatus(correlationId: string, newStatus: ComputationRunState) {
        await this.storageService.updateComputation(correlationId, { status: newStatus })

        const runs = this.storageService.getPluginRuns()
        this.pluginRunsSubject.next([...runs] as ComputationDisplayEntity[])
    }

    triggerSyncTasks() {
        this.syncTasksSubject.next()
    }
}
