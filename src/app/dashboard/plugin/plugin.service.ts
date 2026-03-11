import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { environment } from '@environments/environment'
import type { Feature as GeoJSONFeature, MultiPolygon } from 'geojson'
import { BehaviorSubject, Observable, Subject, map, of, throwError } from 'rxjs'
import { catchError, concatMap, delay, retryWhen, tap, timeout } from 'rxjs/operators'
import { StorageService } from '../../storage.service'
import { derivePluginNameFromId } from '../../utils/string.utils'
import { ComputationRunState, ComputationRunStateInfo } from '../common/status.types'
import {
    ComputationDatabaseEntity,
    ComputationID,
    ComputationMetadata
} from '../computations-index/computation.interface'
import { ComputeState, Plugin } from './plugin.interface'

@Injectable({
    providedIn: 'root'
})
export class PluginService {
    private http = inject(HttpClient)
    private storageService = inject(StorageService)

    private apiUrl = environment.climateActionApiUrl

    private computeStateSubject = new BehaviorSubject<ComputeState>('inactive')
    private syncTasksSubject = new Subject<void>()

    public computeState$ = this.computeStateSubject.asObservable()
    public syncTasks$ = this.syncTasksSubject.asObservable()

    private catalogToggleInput!: HTMLInputElement

    private pluginNameCache = new Map<string, string>()
    private metadataCache = new Map<string, { data: ComputationMetadata; timestamp: number }>()
    private readonly METADATA_CACHE_TTL = 60 * 60 * 1000

    getIconUrl(pluginId: string) {
        return `${this.apiUrl}/store/${pluginId}/icon`
    }

    getPlugins(): Observable<Plugin[]> {
        return this.http.get<Plugin[]>(`${this.apiUrl}/plugin`).pipe(
            tap(plugins => {
                plugins.forEach(p => this.pluginNameCache.set(p.id, p.name))
            })
        )
    }

    getPluginNameById(pluginId: string): string {
        return this.pluginNameCache.get(pluginId) || derivePluginNameFromId(pluginId)
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
                metadata.aoi = metadata.aoi as unknown as GeoJSONFeature<MultiPolygon>
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

    storeNewComputes(compute: ComputationDatabaseEntity): Promise<void> {
        return this.storageService.storeNewCompute(compute)
    }

    getPluginRuns() {
        return this.storageService.getPluginRunsObservable()
    }

    async updateRunStatus(correlationId: string, newStatus: ComputationRunState) {
        await this.storageService.updateComputation(correlationId, { status: newStatus })
    }

    triggerSyncTasks() {
        this.syncTasksSubject.next()
    }
}
