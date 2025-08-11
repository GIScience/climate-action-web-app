import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Input, OnDestroy, OnInit } from '@angular/core'
import type { FeatureCollection } from 'geojson'
import { Subscription } from 'rxjs'
import { MapService } from '../../map/map.service'
import { Artifact } from '../artifact.interface'

@Component({
    selector: 'app-geojson',
    imports: [CommonModule],
    templateUrl: './geojson.component.html',
    styleUrls: ['./geojson.component.scss']
})
export class GeojsonComponent implements OnInit, OnDestroy {
    @Input() inputData: { url: string; artifact: Artifact | null } | undefined
    private subscription?: Subscription
    private layer?: { layerIds: string[]; sourceId: string; name: string }

    constructor(
        private http: HttpClient,
        private mapService: MapService
    ) {}

    ngOnInit() {
        if (!this.inputData?.artifact?.store_id.endsWith('.geojson') || !this.inputData.url) return

        this.subscription = this.http.get<FeatureCollection>(this.inputData.url).subscribe({
            next: data => {
                this.layer = this.mapService.addGeoJsonLayer(data, this.inputData!.artifact!.name || 'Unnamed')
            },
            error: error => console.error('Failed to load GeoJSON:', error)
        })
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe()
        if (!this.layer || !this.mapService.map) return

        const { layerIds, sourceId } = this.layer
        layerIds.forEach(layerId => {
            if (this.mapService.map!.getLayer(layerId)) {
                this.mapService.map!.removeLayer(layerId)
            }
        })

        if (this.mapService.map.getSource(sourceId)) {
            this.mapService.map.removeSource(sourceId)
        }

        this.mapService.featureHoverOverlay?.remove()

        this.mapService.mapPopUp?.remove()

        this.mapService.layerSwitcherControl?.updateLayerControls()
    }
}
