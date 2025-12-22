import { HttpClient } from '@angular/common/http'
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core'
import type { FeatureCollection } from 'geojson'
import { Subscription } from 'rxjs'
import { MapArtifactManagerService } from '../../map/map-artifact-manager.service'
import { MapService } from '../../map/map.service'
import { MapGeoJsonUtils } from '../../map/utils/map-geojson.utils'
import { Artifact, ArtifactEntity } from '../artifact.interface'

@Component({
    selector: 'app-geojson',
    imports: [],
    templateUrl: './geojson.component.html',
    styleUrls: ['./geojson.component.scss']
})
export class GeojsonComponent implements OnInit, OnDestroy {
    private http = inject(HttpClient)
    private mapService = inject(MapService)
    private mapArtifactManager = inject(MapArtifactManagerService)

    @Input() inputData: { url: string; artifact: Artifact | null } | undefined
    private subscription?: Subscription
    private layer?: { layerIds: string[]; sourceId: string; name: string; baseLayerId?: string }

    ngOnInit() {
        if (!this.inputData?.artifact?.store_id.endsWith('.geojson') || !this.inputData.url) return

        this.subscription = this.http.get<FeatureCollection>(this.inputData.url).subscribe({
            next: data => {
                this.layer = this.mapService.addGeoJsonLayer(data, this.inputData!.artifact!.name || 'Unnamed')

                if (this.layer && this.inputData?.artifact) {
                    this.mapArtifactManager.updateLayerInfo(
                        this.inputData.artifact as ArtifactEntity,
                        this.layer.layerIds,
                        this.layer.sourceId
                    )
                }
            },
            error: error => console.error('Failed to load GeoJSON:', error)
        })
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
