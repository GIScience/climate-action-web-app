import {AfterViewInit, Component, Input, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {HttpClient} from '@angular/common/http'
import Map from 'ol/Map'
import {View} from 'ol'
import TileLayer from 'ol/layer/WebGLTile.js'
import ImageLayer from 'ol/layer/Image'
import ImageStatic from 'ol/source/ImageStatic'
import {fromArrayBuffer} from 'geotiff'
import OSM from 'ol/source/OSM'

import {Artifact} from '../../artifact/artifact.interface'
import {fromLonLat} from 'ol/proj'
import {getCenter} from 'ol/extent'

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

        let width: number
        let height: number
        let extent: number[]

        try {
            const response = await fetch(this.inputData.url)
            const arrayBuffer = await response.arrayBuffer()
            const tiff = await fromArrayBuffer(arrayBuffer)
            const image = await tiff.getImage()

            width = image.getWidth()
            height = image.getHeight()
            extent = image.getBoundingBox()

            const rgb = await image.readRGB()

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height

            const context = canvas.getContext('2d')
            if (context) {
                const data = context.getImageData(0, 0, width, height)
                const rgba = data.data
                let j = 0

                for (let i = 0; i < rgb.length; i += 3) {
                    // @ts-ignore valid assignment
                    rgba[j] = rgb[i]
                    // @ts-ignore valid assignment
                    rgba[j + 1] = rgb[i + 1]
                    // @ts-ignore valid assignment
                    rgba[j + 2] = rgb[i + 2]
                    rgba[j + 3] = 255
                    j += 4
                }

                context.putImageData(data, 0, 0)

                const geotiffLayer = new ImageLayer({
                    source: new ImageStatic({
                        url: canvas.toDataURL(),
                        imageExtent: extent,
                        projection: 'EPSG:4326'
                    })
                })

                this.map = new Map({
                    layers: [
                        new TileLayer({
                            source: new OSM()
                        }),
                        geotiffLayer
                    ],
                    target: this.mapDivID,
                    view: new View({
                        center: fromLonLat(extent ? getCenter(extent) : [8.6759928, 49.4187355]),
                        zoom: 12
                    })
                })
            }
        } catch (error) {
            console.error('Error fetching or processing data:', error)
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
