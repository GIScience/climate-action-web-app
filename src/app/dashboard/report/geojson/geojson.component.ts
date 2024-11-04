import {Component, Input, OnInit, OnDestroy} from '@angular/core'
import {CommonModule} from '@angular/common'
import {HttpClient} from '@angular/common/http'
import {Feature} from 'ol'
import {Artifact} from '../../artifact/artifact.interface'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import {Geometry} from 'ol/geom.js'
import {MapService} from '../../map/map.service'

@Component({
    selector: 'app-geojson',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './geojson.component.html',
    styleUrls: ['./geojson.component.scss']
})
export class GeojsonComponent implements OnInit, OnDestroy {

    @Input() inputData: { url: string; artifact: Artifact | null; } | undefined
    geojsonLayer!: VectorLayer<Feature<Geometry>>
    geojsonLayerSource!: VectorSource

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
        }
    }
}
