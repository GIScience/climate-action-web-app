import { ComponentRef, Injectable, OnDestroy, Type, ViewContainerRef, inject } from '@angular/core'
import { LngLatBounds, Map as MapLibreMap } from 'maplibre-gl'
import type Feature from 'ol/Feature'
import type { Geometry } from 'ol/geom'
import { BehaviorSubject, Subscription } from 'rxjs'
import { Artifact, ArtifactData, ArtifactEntity } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { GeojsonComponent } from '../artifact/geojson/geojson.component'
import { GeoTiffComponent } from '../artifact/geotiff/geotiff.component'
import type { MapService } from './map.service'
import { MapConvertMeasureUtils } from './utils/map-convert-measure.utils'

export interface MapArtifactLayer {
    artifact: ArtifactEntity
    layerIds?: string[]
    sourceId?: string
    componentRef?: ComponentRef<GeojsonComponent | GeoTiffComponent>
    pinned: boolean
    computationId?: string
    computationGeometry?: Feature<Geometry>
}

@Injectable({
    providedIn: 'root'
})
export class MapArtifactManagerService implements OnDestroy {
    readonly MAX_MAP_ARTIFACTS = 2

    private layers$ = new BehaviorSubject<MapArtifactLayer[]>([])
    activeMapArtifacts$ = this.layers$.asObservable()

    private artifactService = inject(ArtifactService)
    private subscriptions: Subscription[] = []
    private container?: ViewContainerRef
    private map?: MapLibreMap
    private mapService?: MapService
    private activeArtifactId: { correlation_uuid: string; store_id: string } | null = null

    constructor() {
        const streams = [
            { key: 'geojson', component: GeojsonComponent },
            { key: 'geotiff', component: GeoTiffComponent }
        ] as const

        for (const { key, component } of streams) {
            const stream$ = (this.artifactService as unknown as Record<string, BehaviorSubject<ArtifactData | null>>)[
                key
            ]
            this.subscriptions.push(
                stream$.subscribe(data => {
                    if (data && this.isArtifactOnMap(data)) {
                        this.createMapComponent(data, component)
                    }
                })
            )
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(s => s.unsubscribe())
        this.clearAll()
    }

    setMapInstance(map: MapLibreMap, mapService?: MapService): void {
        this.map = map
        this.mapService = mapService
    }

    setActiveArtifactId(artifact: { correlation_uuid: string; store_id: string } | null): void {
        this.activeArtifactId = artifact
    }

    isArtifactActive(artifact: Artifact): boolean {
        return (
            this.activeArtifactId !== null &&
            this.activeArtifactId.correlation_uuid === artifact.correlation_uuid &&
            this.activeArtifactId.store_id === artifact.store_id
        )
    }

    setComponentContainer(container: ViewContainerRef): void {
        this.container = container
    }

    clearComponentContainer(container: ViewContainerRef): void {
        if (this.container !== container) return
        this.container = undefined
        this.clearAll()
    }

    getActiveMapArtifacts(): MapArtifactLayer[] {
        return this.layers$.value
    }

    isArtifactOnMap(artifact: Artifact): boolean {
        return this.layers$.value.some(l => this.same(l.artifact, artifact))
    }

    isMapArtifact(modality: Artifact['modality']): boolean {
        return modality === 'MAP_LAYER_GEOJSON' || modality === 'MAP_LAYER_GEOTIFF'
    }

    getLayerInfo(artifact: Artifact): MapArtifactLayer | undefined {
        return this.layers$.value.find(l => this.same(l.artifact, artifact))
    }

    isArtifactPersisted(artifact: Artifact): boolean {
        return this.getLayerInfo(artifact)?.pinned ?? false
    }

    setTransientArtifact(
        artifact: ArtifactEntity,
        computationId?: string,
        computationGeometry?: Feature<Geometry>
    ): boolean {
        if (!this.isMapArtifact(artifact.modality)) return false

        const current = this.layers$.value
        const existing = current.find(l => this.same(l.artifact, artifact))
        const transientsToRemove = current.filter(l => !l.pinned && !this.same(l.artifact, artifact))

        let next = current.filter(l => l.pinned || this.same(l.artifact, artifact))

        if (!existing) {
            if (next.length >= this.MAX_MAP_ARTIFACTS) {
                this.layers$.next(next)
                transientsToRemove.forEach(l => l.componentRef?.destroy())
                return false
            }
            next = [...next, { artifact, pinned: false, computationId, computationGeometry }]
        } else if (!existing.pinned && computationId) {
            const idx = next.findIndex(l => this.same(l.artifact, artifact))
            if (idx !== -1) next[idx] = { ...next[idx], computationId, computationGeometry }
        }

        this.layers$.next(next)
        transientsToRemove.forEach(l => l.componentRef?.destroy())
        this.updateFogOfWar()
        return true
    }

    addMapArtifact(
        artifact: ArtifactEntity,
        options: { pinned?: boolean; computationGeometry?: Feature<Geometry>; computationId?: string } = {}
    ): boolean {
        if (!this.isMapArtifact(artifact.modality)) return false

        const pinned = options.pinned ?? false
        const current = this.layers$.value
        const existingIdx = current.findIndex(l => this.same(l.artifact, artifact))
        const pinnedIdsBefore = this.getPinnedIds(current)

        if (existingIdx !== -1) {
            if (pinned && !current[existingIdx].pinned) {
                const key = this.layerKey(current[existingIdx], existingIdx)
                const updated = [...current]
                updated[existingIdx] = { ...current[existingIdx], pinned: true }
                this.layers$.next(updated)
                this.refitIfNewPinned(pinnedIdsBefore, key)
            }
            return true
        }

        const updated = [...current]
        const removed: MapArtifactLayer[] = []

        if (updated.length >= this.MAX_MAP_ARTIFACTS) {
            const removableIdx = updated.findIndex(l => !l.pinned)
            if (removableIdx === -1) return false
            removed.push(...updated.splice(removableIdx, 1))
        }

        const newLayer: MapArtifactLayer = {
            artifact,
            pinned,
            computationGeometry: options.computationGeometry,
            computationId: options.computationId
        }

        this.layers$.next([...updated, newLayer])
        removed.forEach(l => l.componentRef?.destroy())

        if (pinned) {
            this.refitIfNewPinned(pinnedIdsBefore, this.layerKey(newLayer, updated.length))
        } else {
            this.updateFogOfWar()
        }

        return true
    }

    removeMapArtifact(artifact: ArtifactEntity): boolean {
        const current = this.layers$.value
        const idx = current.findIndex(l => this.same(l.artifact, artifact))
        if (idx === -1) return false

        const updated = [...current]
        const [removed] = updated.splice(idx, 1)
        this.layers$.next(updated)
        removed.componentRef?.destroy()
        this.updateFogOfWar()
        return true
    }

    updateLayerInfo(
        artifact: Artifact,
        layerIds: string[],
        sourceId: string,
        componentRef?: ComponentRef<GeojsonComponent | GeoTiffComponent>
    ): void {
        const current = this.layers$.value
        const idx = current.findIndex(l => this.same(l.artifact, artifact))
        if (idx === -1) return

        const updated = [...current]
        updated[idx] = { ...current[idx], layerIds, sourceId, componentRef: componentRef ?? current[idx].componentRef }
        this.layers$.next(updated)
    }

    promoteToPin(artifact: Artifact): boolean {
        const current = this.layers$.value
        const idx = current.findIndex(l => this.same(l.artifact, artifact))
        if (idx === -1 || current[idx].pinned) return false

        const pinnedIdsBefore = this.getPinnedIds(current)
        const key = this.layerKey(current[idx], idx)

        const updated = [...current]
        updated[idx] = { ...current[idx], pinned: true }
        this.layers$.next(updated)

        this.refitIfNewPinned(pinnedIdsBefore, key)
        return true
    }

    unpinArtifact(artifact: Artifact, computationId?: string): boolean {
        const current = this.layers$.value
        const idx = current.findIndex(l => this.same(l.artifact, artifact))
        if (idx === -1 || !current[idx].pinned) return false

        const updated = [...current]
        updated[idx] = { ...current[idx], pinned: false, computationId: computationId || current[idx].computationId }
        this.layers$.next(updated)
        this.updateFogOfWar()
        return true
    }

    clearTransientArtifacts(computationId?: string): void {
        const current = this.layers$.value
        const isTransient = (l: MapArtifactLayer) =>
            !l.pinned && (computationId === undefined || l.computationId === computationId)

        const removed = current.filter(isTransient)
        if (removed.length === 0) return

        this.layers$.next(current.filter(l => !isTransient(l)))
        removed.forEach(l => l.componentRef?.destroy())
        this.updateFogOfWar()
    }

    clearAll(): void {
        const current = this.layers$.value
        if (current.length === 0) return

        this.layers$.next([])
        current.forEach(l => l.componentRef?.destroy())
        this.updateFogOfWar()
    }

    private same(a: Artifact, b: Artifact): boolean {
        return a.correlation_uuid === b.correlation_uuid && a.store_id === b.store_id
    }

    private layerKey(layer: MapArtifactLayer, index: number): string {
        return layer.computationId || layer.artifact.correlation_uuid || layer.artifact.store_id || `layer-${index}`
    }

    private getPinnedIds(layers: MapArtifactLayer[]): Set<string> {
        return new Set(layers.filter(l => l.pinned).map((l, i) => this.layerKey(l, i)))
    }

    private gatherUniqueGeometries(layers: MapArtifactLayer[]): Feature<Geometry>[] {
        const map = new Map<string, Feature<Geometry>>()
        layers.forEach((l, i) => {
            const key = this.layerKey(l, i)
            if (l.computationGeometry && !map.has(key)) {
                map.set(key, l.computationGeometry)
            }
        })
        return [...map.values()]
    }

    private createMapComponent(data: ArtifactData, component: Type<GeojsonComponent | GeoTiffComponent>): void {
        if (!this.container) {
            console.warn('MapArtifactManagerService: no component container registered.')
            return
        }

        const current = this.layers$.value
        const idx = current.findIndex(l => this.same(l.artifact, data))
        if (idx === -1 || current[idx].componentRef) return

        const ref = this.container.createComponent(component)
        ref.instance.inputData = { url: data.url, artifact: data }

        const updated = [...current]
        updated[idx] = { ...current[idx], componentRef: ref }
        this.layers$.next(updated)
    }

    private updateFogOfWar(): void {
        if (!this.mapService) return

        const pinnedLayers = this.layers$.value.filter(l => l.pinned)
        const geometries = this.gatherUniqueGeometries(pinnedLayers)

        if (geometries.length > 0) {
            this.mapService.updateFoWGeometries(geometries, 'pinned')
        } else {
            this.mapService.clearFoWByType('pinned')
        }
    }

    private refitIfNewPinned(pinnedIdsBefore: Set<string>, newId?: string): void {
        if (pinnedIdsBefore.size > 0 && newId && !pinnedIdsBefore.has(newId)) {
            this.autoFitToVisibleArtifacts()
        } else {
            this.updateFogOfWar()
        }
    }

    private autoFitToVisibleArtifacts(): void {
        this.updateFogOfWar()
        if (!this.map) return

        const geometries = this.gatherUniqueGeometries(this.layers$.value)
        if (geometries.length === 0) return

        const bounds = geometries
            .map(g => {
                const geom = g.getGeometry?.()
                if (!geom) return null
                const ext = geom.getExtent()
                const wgs = MapConvertMeasureUtils.transformExtentToWgs84(ext)
                return [wgs[0], wgs[1], wgs[2], wgs[3]] as [number, number, number, number]
            })
            .filter(Boolean) as [number, number, number, number][]

        if (bounds.length === 0) return

        const combined = bounds.reduce(
            (acc, [minLng, minLat, maxLng, maxLat]) => [
                Math.min(acc[0], minLng),
                Math.min(acc[1], minLat),
                Math.max(acc[2], maxLng),
                Math.max(acc[3], maxLat)
            ],
            [Infinity, Infinity, -Infinity, -Infinity]
        )

        const lngLatBounds = new LngLatBounds([combined[0], combined[1]], [combined[2], combined[3]])
        const padding = this.mapService?.calculateMapPadding() ?? { top: 50, right: 100, bottom: 50, left: 250 }
        this.map.fitBounds(lngLatBounds, { padding, animate: true, duration: 500 })
    }
}
