import {AfterViewInit, Component, Input, OnInit} from '@angular/core';
import {CommonModule} from "@angular/common";
import {HttpClient} from "@angular/common/http";
import GeoJSON from "ol/format/GeoJSON.js";
import Map from "ol/Map";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import {View} from "ol";
import {fromLonLat} from "ol/proj";
import {ArtifactType} from "../../models/artifact.interface";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import {Fill, Stroke, Style} from "ol/style";

@Component({
    selector: 'app-geojson',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './geojson.component.html',
    styleUrls: ['./geojson.component.scss']
})
export class GeojsonComponent implements OnInit, AfterViewInit {
    @Input() inputData: { url: string; artifact: ArtifactType | null; } | undefined;
    mapDivID: string = '';
    map!: Map;
    geojsonLayer!: VectorLayer<any>;
    geojsonLayerSource!: VectorSource;

    constructor(private http: HttpClient) {
    }
    ngOnInit(): void {
        if (!this.inputData)
            return
        if (!this.inputData['artifact'])
            return

        const tempMapDivId = this.getFirstPartBeforeDot(this.inputData.artifact.store_id)
        if (!tempMapDivId) {
            console.error('GeojsonComponent >>> store_id doesn\'t contain a dot in it')
            return
        }
        this.mapDivID = tempMapDivId
    }

    ngAfterViewInit(): void {

        if (!this.inputData)
            return
        if (!this.inputData['artifact'])
            return

        this.initMap()

        if (this.inputData.url !== null) {
            this.http.get<GeoJSON>(this.inputData.url).subscribe((data) => {
                console.log('>>> GeojsonComponent >>>  ', data)

                if(! this.geojsonLayerSource)
                    return

                this.geojsonLayerSource.addFeatures(new GeoJSON().readFeatures(data, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                }))
                // Style the features based on the color attribute
                this.geojsonLayer.setStyle((feature) => {
                    const color = feature.get('color') // Assuming 'color' is the attribute name
                    const strokeColor = [0, 0, 0, 1] // Black border color

                    return new Style({
                        fill: new Fill({
                            color: color,
                        }),
                        stroke: new Stroke({
                            color: strokeColor,
                            width: 0.5,
                        }),
                    })
                })

                // zoom to extent
                this.map.getView().fit(this.geojsonLayerSource.getExtent(), {
                    padding: [30, 10, 30, 10],
                    duration: 1000
                })
            })
        }
    }

    private initMap() {
        this.geojsonLayerSource = new VectorSource()
        this.geojsonLayer = new VectorLayer({
            source: this.geojsonLayerSource,
        }),
        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                this.geojsonLayer
            ],
            target: this.mapDivID,
            view: new View({
                center: fromLonLat([8.6759928, 49.4187355]),
                zoom: 10,
            }),
        })
    }

    getFirstPartBeforeDot(inputString: string): string | null {
        if (inputString.includes('.')) {
            const parts = inputString.split('.')
            return parts[0]
        }
        return null; // Return null if the string doesn't contain a period
    }
}
