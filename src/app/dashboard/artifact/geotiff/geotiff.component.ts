import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core'
import { MapService } from '../../map/map.service'
import { Artifact } from '../artifact.interface'

@Component({
    selector: 'app-geotiff',
    imports: [],
    templateUrl: './geotiff.component.html',
    styleUrls: ['./geotiff.component.scss']
})
export class GeoTiffComponent implements OnInit, OnDestroy {
    private mapService = inject(MapService)

    @Input() inputData: { url: string; artifact: Artifact | null } | undefined
    private geoTiffLayer?: { id: string; sourceId: string; name: string }

    async ngOnInit() {
        if (!this.inputData?.artifact || !this.inputData.url) return
        try {
            this.geoTiffLayer = await this.mapService.addGeoTiffLayer(this.inputData.url, this.inputData.artifact.name)
        } catch (error) {
            console.error('Failed to load GeoTIFF layer:', error)
        }
    }

    ngOnDestroy() {
        if (!this.geoTiffLayer || !this.mapService.map) return
        const { id, sourceId } = this.geoTiffLayer
        if (this.mapService.map.getLayer(id)) {
            this.mapService.map.removeLayer(id)
        }
        if (this.mapService.map.getSource(sourceId)) {
            this.mapService.map.removeSource(sourceId)
        }

        this.mapService.layerSwitcherControl?.updateLayerControls()
    }
}
