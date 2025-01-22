import {Component, Input, OnDestroy, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {HttpClient} from '@angular/common/http'
import {Artifact} from '../artifact.interface'
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

    constructor(private http: HttpClient, private mapService: MapService) {
    }

    ngOnInit(): void {
        if (!this.inputData || !this.inputData['artifact'] || !this.inputData.url ||
            !this.inputData['artifact'].store_id.endsWith('.geojson'))
            return

        const artifactName = this.inputData.artifact?.name
        this.http.get<object>(this.inputData.url).subscribe((data) => {
            this.mapService.addGeoJsonLayer(data, artifactName)
        })
    }

    ngOnDestroy(): void {
        if (this.mapService.geojsonLayer) {
            this.mapService.map?.removeLayer(this.mapService.geojsonLayer)
            if (this.mapService.featureHoverOverlay && this.mapService.featureClickOverlay) {
                this.mapService.map?.removeLayer(this.mapService.featureHoverOverlay)
                this.mapService.map?.removeLayer(this.mapService.featureClickOverlay)
                this.mapService.mapPopUp?.setPosition(undefined)
            }
        }
    }
}
