import { CommonModule } from '@angular/common'
import { Component, Input, OnDestroy, OnInit } from '@angular/core'
import TileLayer from 'ol/layer/WebGLTile.js'
import { MapService } from '../../map/map.service'
import { Artifact } from '../artifact.interface'

@Component({
    selector: 'app-geotiff',
    imports: [CommonModule],
    templateUrl: './geotiff.component.html',
    styleUrls: ['./geotiff.component.scss']
})
export class GeoTiffComponent implements OnInit, OnDestroy {
    @Input() inputData: { url: string; artifact: Artifact | null } | undefined
    private geoTiffLayer: TileLayer | undefined

    constructor(private mapService: MapService) {}

    ngOnInit(): void {
        if (!this.inputData || !this.inputData['artifact']) return

        this.initMap()
    }

    ngOnDestroy(): void {
        if (this.geoTiffLayer) {
            this.mapService.map?.removeLayer(this.geoTiffLayer)
        }
    }

    private async initMap() {
        if (!this.inputData) return
        const artifactName = this.inputData.artifact?.name
        this.geoTiffLayer = await this.mapService.addGeoTiffLayer(this.inputData.url, artifactName)
    }
}
