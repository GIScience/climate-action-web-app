import {AfterViewInit, Component, Input, OnInit} from '@angular/core';
import {CommonModule} from "@angular/common";
import {HttpClient} from "@angular/common/http";
import GeoTIFF from 'ol/source/GeoTIFF.js';
import Map from "ol/Map";
import TileLayer from "ol/layer/WebGLTile.js";
import BaseLayer from 'ol/layer/Base';
import {ArtifactType} from "../../models/artifact.interface";

@Component({
    selector: 'app-geotiff',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './geotiff.component.html',
    styleUrls: ['./geotiff.component.scss']
})
export class GeoTiffComponent implements OnInit, AfterViewInit {
    @Input() inputData: { url: string; artifact: ArtifactType | null; } | undefined;
    mapDivID: string = '';
    map!: Map;
    geotiffLayer!: BaseLayer;
    geotiffLayerSource!: GeoTIFF;

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
    }

    private initMap() {
        if (!this.inputData)
            return

        console.log('this.inputData.url ', this.inputData.url)

        this.geotiffLayerSource = new GeoTIFF({
            sources: [
                {
                    url: this.inputData.url,
                    // url: 'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/TCI.tif',
                },
            ],
        }),
        this.geotiffLayer = new TileLayer({
            source: this.geotiffLayerSource
        })

        this.map = new Map({
            layers: [
                // new TileLayer({
                //     source: new OSM(),
                // }),
                this.geotiffLayer
            ],
            target: this.mapDivID,
            view: this.geotiffLayerSource.getView(),
        })

        // Get the extent of the GeoTIFF source
        // this.geotiffLayerSource.on('tileloadend', async () => {
        //     const geoTiffLayerView = await this.geotiffLayerSource.getView();
        //     const geoTiffExtent = geoTiffLayerView.extent
        //
        //     console.log('geoTiffExtent = ', geoTiffExtent)
        //     // Zoom to the extent
        //     // if(geoTiffExtent) {
        //     //     if(this.map.getSize())
        //     //         this.map.getView().fit(geoTiffExtent, this.map.getSize());
        //     // }
        // });
    }

    getFirstPartBeforeDot(inputString: string): string | null {
        if (inputString.includes('.')) {
            const parts = inputString.split('.')
            return parts[0]
        }
        return null; // Return null if the string doesn't contain a period
    }
}
