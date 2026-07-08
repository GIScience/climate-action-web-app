import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core'
import { Artifact, ArtifactEntity } from '@app/dashboard/artifact/artifact.interface'
import { MapArtifactManagerService } from '@app/dashboard/map/map-artifact-manager.service'
import { MapService } from '@app/dashboard/map/map.service'

@Component({
    selector: 'app-raster',
    imports: [],
    templateUrl: './raster.component.html',
    styleUrls: ['./raster.component.scss']
})
export class RasterComponent implements OnInit, OnDestroy {
    private mapService = inject(MapService)
    private mapArtifactManager = inject(MapArtifactManagerService)

    @Input() inputData: { url: string; artifact: Artifact | null } | undefined
    private geoTiffLayer?: { id: string; sourceId: string; name: string }

    async ngOnInit() {
        if (!this.inputData?.artifact || !this.inputData.url) return
        try {
            const layer = await this.mapService.addRasterLayer(this.inputData.url, this.inputData.artifact.name)

            if (layer && this.inputData.artifact) {
                this.geoTiffLayer = { id: layer.id, sourceId: layer.sourceId, name: layer.name }

                this.mapArtifactManager.updateLayerInfo(
                    this.inputData.artifact as ArtifactEntity,
                    [layer.id],
                    layer.sourceId
                )
            }
        } catch (error) {
            console.error('Failed to load GeoTIFF layer:', error)
        }
    }

    ngOnDestroy() {
        if (
            this.inputData?.artifact &&
            !this.mapArtifactManager.isArtifactOnMap(this.inputData.artifact as ArtifactEntity)
        ) {
            this.cleanupLayer()
        }
    }

    private cleanupLayer() {
        if (!this.geoTiffLayer || !this.mapService.map) return

        const { map } = this.mapService
        const { id, sourceId } = this.geoTiffLayer

        if (map.getLayer(id)) {
            map.removeLayer(id)
        }

        if (map.getSource(sourceId)) {
            map.removeSource(sourceId)
        }
        this.mapService.layerSwitcherControl?.updateLayerControls()
    }
}
