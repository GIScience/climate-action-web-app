import {Component, Input, OnDestroy, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {HttpClient} from '@angular/common/http'
import {Artifact} from '../../artifact/artifact.interface'
import VectorTileLayer from 'ol/layer/VectorTile'
import {MapService} from '../../map/map.service'
import RenderFeature from 'ol/render/Feature'

@Component({
    selector: 'app-geojson',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './geojson.component.html',
    styleUrls: ['./geojson.component.scss']
})
export class GeojsonComponent implements OnInit, OnDestroy {

    @Input() inputData: { url: string; artifact: Artifact | null; } | undefined
    geojsonLayer!: VectorTileLayer<RenderFeature>

    constructor(private http: HttpClient, private mapService: MapService) {
    }

    ngOnInit(): void {
        if (!this.inputData || !this.inputData['artifact'] || !this.inputData.url ||
            !this.inputData['artifact'].store_id.endsWith('.geojson'))
            return

        const artifactName = this.inputData.artifact?.name
        this.http.get<object>(this.inputData.url).subscribe((data) => {
            this.geojsonLayer = this.mapService.addGeoJsonLayer(data, artifactName)
        })
    }

    ngOnDestroy(): void {
        if (this.geojsonLayer) {
            this.mapService.map?.removeLayer(this.geojsonLayer)
            if (this.mapService.featureClickOverlay) {
                this.mapService.map?.removeLayer(this.mapService.featureClickOverlay)
                this.mapService.mapPopUp?.setPosition(undefined)
            }
        }
    }
}
