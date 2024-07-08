import {AfterViewInit, Component, Input, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {HttpClient} from '@angular/common/http'
import Map from 'ol/Map'
import TileLayer from 'ol/layer/WebGLTile.js'

import {Artifact} from '../../artifact/artifact.interface'
import GeoTIFF from 'ol/source/GeoTIFF'
import OSM from 'ol/source/OSM'
import {fromLonLat} from 'ol/proj'
import {getCenter} from 'ol/extent'
import {View} from 'ol'

@Component({
    selector: 'app-geotiff',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './geotiff.component.html',
    styleUrls: ['./geotiff.component.scss']
})
export class GeoTiffComponent implements OnInit, AfterViewInit {

    @Input() inputData: { url: string, artifact: Artifact | null } | undefined
    mapDivID = ''
    map!: Map

    constructor(private http: HttpClient) {
    }

    ngOnInit(): void {
        if (!this.inputData || !this.inputData['artifact'])
            return


        const tempMapDivId = this.getFirstPartBeforeDot(this.inputData.artifact.store_id)
        if (!tempMapDivId) {
            console.error('GeojsonComponent >>> store_id doesn\'t contain a dot in it')
            return
        }
        this.mapDivID = tempMapDivId
    }

    ngAfterViewInit(): void {
        if (!this.inputData || !this.inputData['artifact'])
            return

        this.initMap()
    }

    private async initMap() {
        if (!this.inputData)
            return

        const geoTiffResponse = await fetch(this.inputData.url)
        const geoTiffBlob = await geoTiffResponse.blob()
        const geoTiffSource = new GeoTIFF({
            sources: [
                {
                    blob: geoTiffBlob,
                    // The following options are due to https://github.com/openlayers/openlayers/issues/15894
                    bands: [1, 2, 3],
                    nodata: 0
                }
            ],
            convertToRGB: true,
            interpolate: false
        })
        const geotiffView = await geoTiffSource.getView()
        const geotiffExtend = geotiffView.extent
        const geotiffCenter = fromLonLat(geotiffExtend ? getCenter(geotiffExtend) : [8.6759928, 49.4187355])

        this.map = new Map({
            target: this.mapDivID,
            layers: [
                new TileLayer({
                    source: new OSM()
                }),
                new TileLayer({
                    source: geoTiffSource
                })
            ],
            view: new View({
                center: geotiffCenter,
                zoom: 12
            })
        })
    }

    getFirstPartBeforeDot(inputString: string): string | null {
        if (inputString.includes('.')) {
            const parts = inputString.split('.')
            return parts[0]
        }
        return null
    }
}
