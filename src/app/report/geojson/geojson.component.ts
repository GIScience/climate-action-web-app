import {AfterViewInit, Component, Input, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {HttpClient} from '@angular/common/http'
import GeoJSON from 'ol/format/GeoJSON.js'
import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import {View} from 'ol';
import {fromLonLat, transformExtent} from 'ol/proj'
import {getCenter} from 'ol/extent'
import {Vector} from 'ol/source'
import {Artifact} from '../../artifact/artifact.interface'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import {Fill, Stroke, Style, Circle} from 'ol/style'
import {Geometry} from 'ol/geom.js'

@Component({
    selector: 'app-geojson',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './geojson.component.html',
    styleUrls: ['./geojson.component.scss']
})
export class GeojsonComponent implements OnInit, AfterViewInit {

    @Input() inputData: { url: string; artifact: Artifact | null; } | undefined
    mapDivID = ''
    map!: Map
    geojsonLayer!: VectorLayer<VectorSource<Geometry>>
    geojsonLayerSource!: VectorSource

    constructor(private http: HttpClient) {
    }

    ngOnInit(): void {
        if (!this.inputData || !this.inputData['artifact'])
            return

        const tempMapDivId = this.getFirstPartBeforeDot(this.inputData.artifact.store_id)
        if (!tempMapDivId) {
            console.error(`Malformed store id ${this.inputData.artifact.store_id}`)
            return
        }
        this.mapDivID = tempMapDivId
    }

    ngAfterViewInit(): void {

        if (!this.inputData || !this.inputData['artifact'])
            return

        if (this.inputData.url !== null) {
            this.http.get<object>(this.inputData.url).subscribe((data) => {
                const features = new GeoJSON().readFeatures(data, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                })

                const extent = transformExtent(new Vector({
                    features: features
                }).getExtent(), 'EPSG:3857', 'EPSG:4326')

                this.geojsonLayerSource = new VectorSource()
                this.geojsonLayerSource.addFeatures(features)

                this.geojsonLayer = new VectorLayer({
                    source: this.geojsonLayerSource
                })

                this.map = new Map({
                    layers: [
                        new TileLayer({
                            source: new OSM()
                        }),
                        this.geojsonLayer
                    ],
                    target: this.mapDivID,
                    view: new View({
                        center: fromLonLat(extent ? getCenter(extent) : [8.6759928, 49.4187355]),
                        zoom: 14
                    })
                })

                this.geojsonLayer.setStyle((feature) => {
                    const color = feature.get('color')
                    const strokeColor = [0, 0, 0, 1]

                    return new Style({
                        fill: new Fill({
                            color: color
                        }),
                        stroke: new Stroke({
                            color: strokeColor,
                            width: 2
                        }),
                        image: new Circle({
                            radius: 5,
                            stroke: new Stroke({
                                color: strokeColor
                            }),
                            fill: new Fill({
                                color: color
                            })
                        })
                    })
                })
            })
        }
    }

    getFirstPartBeforeDot(inputString: string): string | null {
        if (inputString.includes('.')) {
            const parts = inputString.split('.')
            return parts[0]
        }
        return null
    }
}
