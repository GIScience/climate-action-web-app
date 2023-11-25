import {AfterViewInit, Component, Input, OnChanges} from '@angular/core'
import {Router} from "@angular/router"
import {FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms'
import {FormlyFieldConfig, FormlyFormOptions, FormlyModule} from "@ngx-formly/core"
import {FormlyJsonschema} from '@ngx-formly/core/json-schema'
import Map from 'ol/Map'
import OSM from 'ol/source/OSM'
import TileLayer from 'ol/layer/Tile'
import {View} from "ol"
import {fromLonLat} from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import {Fill, Stroke, Style} from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON.js'

import {regions} from '../../support/region-of-interest'
import {FeatureLike} from 'ol/Feature.js'
import {Geometry} from 'ol/geom.js'
import {PluginService} from "../../services/plugin.service"
import {ToastService} from "../../services/toast.service"
import {Plugin} from "../plugin.interface"
import {PluginParametersSchema, PluginPropertiesSchema} from "./plugin-parameter.interface"

@Component({
    selector: 'app-plugin-parameter',
    templateUrl: './plugin-parameter.component.html',
    styleUrls: ['./plugin-parameter.component.scss'],
    imports: [
        FormlyModule,
        FormsModule,
        ReactiveFormsModule
    ],
    standalone: true
})
export class PluginParameterComponent implements OnChanges, AfterViewInit {

    @Input() schema!: PluginParametersSchema
    @Input() plugin!: Plugin

    tempSchema: { schema: any, model: any } = {schema: {}, model: {}}
    model: any = {}
    options: FormlyFormOptions = {}
    form = new FormGroup({})
    fields: FormlyFieldConfig[] = []
    map: Map | undefined
    regionLayer: VectorLayer<VectorSource<Geometry>> | undefined
    selectedRegionLayer!: VectorLayer<VectorSource<Geometry>>
    jsonSchema_polygon = 'Feature_MultiPolygon'
    highlightedFeature: Array<FeatureLike> = []

    constructor(private formlyJsonschema: FormlyJsonschema,
                private pluginService: PluginService,
                private toastService: ToastService,
                private router: Router) {
    }

    onSubmit(model: any) {
        const features = this.selectedRegionLayer.getSource()?.getFeatures()
        if (features && features[0]) {
            const paramFeature = new GeoJSON().writeFeaturesObject(features, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })

            for (const [key, value] of Object.entries(this.schema.properties)) {
                if (!value)
                    return

                if (value && value.allOf && value.allOf[0].$ref) {
                    const refVal: string = value['allOf'][0]['$ref']
                    if (refVal.includes(this.jsonSchema_polygon)) {
                        model[key] = paramFeature.features[0]
                    }
                }
            }
        }

        if (this.checkForRequiredFields(model, this.tempSchema.schema)) {
            this.requestCompute(model)
        } else {
            this.toastService.show({
                title: 'Required fields empty!',
                body: 'Please enter values to the required fields',
                type: 'error',
                time: 4000
            })
        }

    }

    ngOnChanges(): void {
        if (!this.schema)
            return

        this.fields = []
        this.model = {}
        this.tempSchema = {
            "schema": {
                "title": "Parameters",
                "description": "A simple form example.",
                "type": "object",
                "required": [],
                "properties": {}
            },
            "model": {}
        }

        this.tempSchema.schema.required = this.schema.required
        this.tempSchema.schema.$defs = this.schema.$defs

        for (const [key, value] of Object.entries(this.schema.properties)) {
            if (!value)
                return

            const propertiesSchema: any = {}

            if (value['anyOf']) {
                const arr: any[] = []

                // @ts-ignore can be any
                value['anyOf'].forEach(val => {
                    arr.push(val.type)

                    if (val.type === 'number' || val.type === 'integer') {
                        const minMaxRange = this.checkForMinAndMaxRange(val)
                        propertiesSchema['maximum'] = minMaxRange.max
                        propertiesSchema['minimum'] = minMaxRange.min
                    }

                    if (val['type'] === 'string' && val['format'] === 'date') {
                        const minMaxRange = this.checkForMinAndMaxDateRange(val)
                        propertiesSchema['max'] = minMaxRange.max
                        propertiesSchema['min'] = minMaxRange.min
                        value['type'] = 'text'
                    }

                    if (val['$ref']) {
                        propertiesSchema['$ref'] = val['$ref']
                    }
                    if (val['items']) {
                        propertiesSchema['items'] = val['items']
                    }
                })
                propertiesSchema['type'] = arr
            } else {
                propertiesSchema['type'] = value['type']
            }

            if (value['type'] === 'number') {
                const minMaxRange = this.checkForMinAndMaxRange(value)
                propertiesSchema['maximum'] = minMaxRange.max
                propertiesSchema['minimum'] = minMaxRange.min
            }
            if (value['type'] === 'string' && value['format'] === 'date') {
                const minMaxRange = this.checkForMinAndMaxDateRange(value)
                propertiesSchema['max'] = minMaxRange.max
                propertiesSchema['min'] = minMaxRange.min
                value['type'] = 'text'
            }
            if (value['$ref']) {
                propertiesSchema['$ref'] = value['$ref']
            }

            propertiesSchema['title'] = value.title
            propertiesSchema['description'] = value.description

            if (value.examples && value.examples.length > 0) {
                propertiesSchema['props'] = {'placeholder': value.examples[0]}
            }

            if (value['enum']) {
                propertiesSchema['enum'] = value['enum']
            }
            this.tempSchema.schema.properties[key] = propertiesSchema
        }

        this.tempSchema.model = this.model
        this.fields = [this.formlyJsonschema.toFieldConfig(this.tempSchema.schema)]
    }

    ngAfterViewInit(): void {
        this.initMap()
    }

    private initMap() {
        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
            ],
            target: 'map',
            view: new View({
                center: fromLonLat([8.6759928, 49.4187355]),
                zoom: 10,
            }),
        })

        this.selectedRegionLayer = new VectorLayer({
            source: new VectorSource(),
            map: this.map,
            style: {
                'stroke-color': 'rgba(255, 0, 0, 0.7)',
                'stroke-width': 2,
            },
        })

        const regionSource = new VectorSource()
        this.regionLayer = new VectorLayer({
            source: regionSource,
            style: new Style({
                fill: new Fill({color: 'rgba(0, 0, 255, 0.1)'}),
                stroke: new Stroke({color: 'blue', width: 2})
            })
        })
        this.map.addLayer(this.regionLayer)

        regionSource.addFeatures(new GeoJSON().readFeatures(regions, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        }))

        this.map.on('click', (evt) => {
            this.selectRegions(evt.pixel)
        })
    }

    private selectRegions(pixel: Array<number>) {
        if (this.regionLayer) {
            this.regionLayer.getFeatures(pixel).then((features) => {
                if (features) {
                    const feature = features[0]
                    const selIndex = this.highlightedFeature.indexOf(feature)
                    if (selIndex < 0) {
                        if (feature) {
                            this.highlightedFeature.push(feature)
                        }
                    } else {
                        this.highlightedFeature.splice(selIndex, 1)
                    }

                    this.selectedRegionLayer.getSource()?.clear()
                    if (this.highlightedFeature.length > 0) {
                        // @ts-ignore TODO possible type mismatch
                        this.selectedRegionLayer.getSource().addFeatures(this.highlightedFeature)
                    }
                }
            })
        }
    }

    private checkForMinAndMaxRange(value: PluginPropertiesSchema) {
        return {
            min: value.exclusiveMaximum || value.Maximum || Number.NEGATIVE_INFINITY,
            max: value.exclusiveMinimum || value.Minimum || Number.POSITIVE_INFINITY
        }
    }

    private checkForMinAndMaxDateRange(value: PluginPropertiesSchema) {
        const today = new Date().toISOString().substring(0, 10).replace("T", " ")
        return {
            min: value.exclusiveMaximum || value.Maximum || '1970-01-01',
            max: value.exclusiveMinimum || value.Minimum || today
        }
    }

    private requestCompute(model: any) {
        this.pluginService.computePlugin(this.plugin.plugin_id, model).subscribe({
            next: (data) => {
                this.pluginService.storeComputes(data.correlation_uuid, this.plugin)
                this.toastService.show({
                    title: `${this.plugin.plugin_id} parameters are send to process!`,
                    body: `Result from plugin execution will be listing on the dashboard`,
                    type: 'success',
                    time: 4000
                })
                setTimeout(() => {
                    this.router.navigate(['dashboard'])
                }, 1000)

            },
            error: error => {
                console.error('Error while request to compute plugin:', error)
                this.toastService.show({
                    title: `Error while computing plugin ${this.plugin.name}`,
                    body: `Error while computing plugin ${this.plugin.name}`,
                    type: 'error',
                    time: 4000
                })
            }
        })
    }

    private checkForRequiredFields(model: any, schema: PluginParametersSchema): boolean {
        if (!schema['required']) return true

        const requiredList: string[] = schema['required']
        return requiredList.every((i) => Object.prototype.hasOwnProperty.call(model, i))
    }
}
