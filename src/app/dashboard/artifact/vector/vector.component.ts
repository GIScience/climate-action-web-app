import { HttpClient } from '@angular/common/http'
import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core'
import { Artifact, ArtifactEntity } from '@app/dashboard/artifact/artifact.interface'
import { MapArtifactManagerService } from '@app/dashboard/map/map-artifact-manager.service'
import { MapService } from '@app/dashboard/map/map.service'
import { MapGeoJsonUtils } from '@app/dashboard/map/utils/map-geojson.utils'
import { getVectorArtifactFormat } from '@app/utils/artifact.utils'
import type { FeatureCollection } from 'geojson'
import { from, Subscription } from 'rxjs'

@Component({
    selector: 'app-vector',
    imports: [],
    templateUrl: './vector.component.html',
    styleUrls: ['./vector.component.scss']
})
export class VectorComponent implements OnInit, OnDestroy {
    private http = inject(HttpClient)
    private mapService = inject(MapService)
    private mapArtifactManager = inject(MapArtifactManagerService)

    @Input() inputData: { url: string; artifact: Artifact | null } | undefined
    private subscription?: Subscription
    private layer?: { layerIds: string[]; sourceId: string; name: string; baseLayerId?: string }

    ngOnInit() {
        if (!this.inputData?.url || !this.inputData.artifact) return

        const { url, artifact } = this.inputData
        const format = getVectorArtifactFormat(artifact)

        if (format === 'geojson') {
            this.subscription = this.http.get<FeatureCollection>(url).subscribe({
                next: data => {
                    this.layer = this.mapService.addGeoJsonLayer(data, artifact.name || 'Unnamed')
                    this.registerLayerWithArtifactManager()
                },
                error: error => console.error('Failed to load GeoJSON:', error)
            })
        } else if (format === 'pmtiles') {
            this.subscription = from(this.mapService.addPmtilesLayer(url, artifact.name || 'Unnamed')).subscribe({
                next: layer => {
                    this.layer = layer
                    this.registerLayerWithArtifactManager()
                },
                error: error => console.error('Failed to load PMTiles:', error)
            })
        } else {
            console.error('Unsupported vector file format:', artifact.filename)
        }
    }

    private registerLayerWithArtifactManager() {
        if (this.layer && this.inputData?.artifact) {
            this.mapArtifactManager.updateLayerInfo(
                this.inputData.artifact as ArtifactEntity,
                this.layer.layerIds,
                this.layer.sourceId
            )
        }
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe()

        if (
            this.inputData?.artifact &&
            !this.mapArtifactManager.isArtifactOnMap(this.inputData.artifact as ArtifactEntity)
        ) {
            this.cleanupLayer()
        }
    }

    private cleanupLayer() {
        if (!this.layer || !this.mapService.map) return

        const { map } = this.mapService
        const { layerIds, sourceId, baseLayerId } = this.layer

        layerIds.forEach(id => {
            if (map.getLayer(id)) {
                map.removeLayer(id)
            }
        })

        if (map.getSource(sourceId)) {
            map.removeSource(sourceId)
        }

        const hasRemainingGeoJsonLayers = MapGeoJsonUtils.cleanupGeoJsonInteractions(map, baseLayerId)
        if (!hasRemainingGeoJsonLayers) {
            this.mapService.featureHoverOverlay?.remove()
            this.mapService.mapPopUp?.remove()
        }
        this.mapService.layerSwitcherControl?.updateLayerControls()
    }
}
