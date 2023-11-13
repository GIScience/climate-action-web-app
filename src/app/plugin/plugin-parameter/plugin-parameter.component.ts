import {AfterViewInit, Component, Input, OnChanges} from '@angular/core';
import {Router} from "@angular/router";
import {FormGroup} from '@angular/forms';
import {FormlyFieldConfig, FormlyFormOptions} from "@ngx-formly/core";
import {FormlyJsonschema} from '@ngx-formly/core/json-schema';
import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import {View} from "ol";
import {fromLonLat} from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Fill, Stroke, Style, Text} from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON.js';
// @ts-ignore
import {testSchema} from './test.js';
import {regions} from '../../support/region-of-interest';
import {FeatureLike} from 'ol/Feature.js';
import {Geometry} from 'ol/geom.js';
import {PluginService} from "../../services/plugin.service";
import {ToastService} from "../../services/toast.service";

@Component({
    selector: 'app-plugin-parameter',
    templateUrl: './plugin-parameter.component.html',
    styleUrls: ['./plugin-parameter.component.scss']
})
export class PluginParameterComponent implements OnChanges, AfterViewInit {

    @Input() schema: any
    @Input() pluginId!: string

    tempSchema: { schema: any; model: any; } = { schema: {}, model: {} };
    model: any = {};
    options: FormlyFormOptions = {};
    form = new FormGroup({});
    fields: FormlyFieldConfig[] = [];
    map: Map | undefined;
    regionLayer: VectorLayer<VectorSource<Geometry>> | undefined;
    selectedRegionLayer!: VectorLayer<VectorSource<Geometry>>;
    jsonSchema_polygon = 'Feature_MultiPolygon';
    highlightedFeature: Array<FeatureLike> = [];

    constructor(private formlyJsonschema: FormlyJsonschema,
                private pluginService: PluginService,
                private toastService: ToastService,
                private router: Router) {
    }

    onSubmit(model: any) {
        if (this.selectedRegionLayer.getSource()?.getFeatures()[0]) {
            // @ts-ignore
            const paramFeature = new GeoJSON().writeFeaturesObject(this.selectedRegionLayer.getSource()?.getFeatures(), {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })

            for (const [key, value] of Object.entries(this.schema.properties)) {
                if (!value)
                    return

                // @ts-ignore
                if (value['allOf'] && value['allOf'][0]) {
                    // @ts-ignore
                    const refVal: string = value['allOf'][0]['$ref']
                    if (refVal.includes(this.jsonSchema_polygon)) {
                        model[key] = paramFeature.features[0]
                    }
                }
            }
        }
        console.debug(model)

        // check if all required fields are entered
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

        // @ts-ignore
        this.tempSchema.schema.required = this.schema.required
        // @ts-ignore
        this.tempSchema.schema['$defs'] = this.schema.$defs
        for (const [key, value] of Object.entries(this.schema.properties)) {
            if (!value)
                return

            let propertiesSchema: any = {}

            // @ts-ignore
            if (value['anyOf']) {
                let arr: any[] = []
                // @ts-ignore
                value['anyOf'].forEach(val => {
                    arr.push(val.type)

                    if (val.type === 'number' || val.type === 'integer') {
                        // check for min and max ranges
                        const minMaxRange = this.checkForMinAndMaxRange(val)
                        // @ts-ignore
                        propertiesSchema['maximum'] = minMaxRange.max
                        // @ts-ignore
                        propertiesSchema['minimum'] = minMaxRange.min
                    }
                    // @ts-ignore
                    if (val['type'] === 'string' && val['format'] === 'date') {
                        // check for min and max date ranges
                        // @ts-ignore
                        const minMaxRange = this.checkForMinAndMaxDateRange(val)
                        // @ts-ignore
                        propertiesSchema['max'] = minMaxRange.max
                        // @ts-ignore
                        propertiesSchema['min'] = minMaxRange.min
                        // @ts-ignore
                        // value['type'] = 'date' // Since bootstrap doesn't support input type "date" this won't work #12
                        value['type'] = 'text'
                    }

                    if (val['$ref']) {
                        propertiesSchema['$ref'] = val['$ref']
                    }
                    if (val['items']) {
                        propertiesSchema['items'] = val['items']
                    }
                })
                // @ts-ignore
                propertiesSchema['type'] = arr
            } else {
                // @ts-ignore
                propertiesSchema['type'] = value['type']
            }

            // @ts-ignore
            if (value['type'] === 'number') {
                // check for min and max ranges
                // @ts-ignore
                const minMaxRange = this.checkForMinAndMaxRange(value)
                // @ts-ignore
                propertiesSchema['maximum'] = minMaxRange.max
                // @ts-ignore
                propertiesSchema['minimum'] = minMaxRange.min
            }
            // @ts-ignore
            if (value['type'] === 'string' && value['format'] === 'date') {
                // check for min and max date ranges
                // @ts-ignore
                const minMaxRange = this.checkForMinAndMaxDateRange(value)
                // @ts-ignore
                propertiesSchema['max'] = minMaxRange.max
                // @ts-ignore
                propertiesSchema['min'] = minMaxRange.min
                // @ts-ignore
                // value['type'] = 'date' // Since bootstrap doesn't support input type "date" this won't work #12
                value['type'] = 'text'
            }
            // @ts-ignore
            if (value['$ref']) {
                // @ts-ignore
                propertiesSchema['$ref'] = value['$ref']
            }

            // @ts-ignore
            propertiesSchema['title'] = value.title
            // @ts-ignore
            propertiesSchema['description'] = value.description
            // @ts-ignore
            if (value.examples && value.examples.length > 0) {
                // @ts-ignore
                // propertiesSchema['default'] = value.examples[0]
                // @ts-ignore
                propertiesSchema['props'] = {'placeholder': value.examples[0]}
            }

            // @ts-ignore
            if (value['enum']) {
                // @ts-ignore
                propertiesSchema['enum'] = value['enum']
            }

            // @ts-ignore
            this.tempSchema.schema.properties[key] = propertiesSchema
        }

        // console.log('this.model = ', this.model)
        this.tempSchema.model = this.model
        // console.log('this.tempSchema = ', this.tempSchema)

        // @ts-ignore
        this.fields = [this.formlyJsonschema.toFieldConfig(this.tempSchema.schema)];
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

        let regionSource = new VectorSource()
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
        this.regionLayer!.getFeatures(pixel).then((features) => {
            const feature = features.length ? features[0] : undefined;

            // @ts-ignore
            const selIndex = this.highlightedFeature.indexOf(feature);
            if (selIndex < 0) {
                if(feature) {
                    // @ts-ignore
                    this.highlightedFeature.push(feature)
                }
            } else {
                this.highlightedFeature.splice(selIndex, 1)
            }

            // @ts-ignore
            this.selectedRegionLayer.getSource().clear()
            if(this.highlightedFeature.length > 0) {
                // @ts-ignore
                this.selectedRegionLayer.getSource().addFeatures(this.highlightedFeature)
            }
        })
    }

    private checkForMinAndMaxRange(val: any) {
        let returnRange = {
            min: Number.NEGATIVE_INFINITY,
            max: Number.POSITIVE_INFINITY
        }
        if (val['exclusiveMaximum'] || val['Maximum']) {
            // @ts-ignore
            returnRange.max = val['exclusiveMaximum'] || val['Maximum']
        }
        if (val['exclusiveMinimum'] || val['Minimum']) {
            // @ts-ignore
            returnRange.min = val['exclusiveMinimum'] || val['Minimum']
        }

        return returnRange
    }

    private checkForMinAndMaxDateRange(value: {
        examples: [boolean];
        description: string;
        title: string;
        type: string
    } | {
        default: number;
        examples: [number];
        anyOf: [{ exclusiveMaximum: number, exclusiveMinimum: number, type: string }, { type: string }];
        description: string;
        title: string
    } | {
        default: string;
        examples: [string];
        anyOf: [{ format: string, type: string }, { type: string }];
        description: string;
        title: string
    } | {
        default: string;
        examples: [string];
        anyOf: [{ type: string }, { type: string }];
        description: string;
        title: string
    } | {
        default: [string];
        examples: [[string]];
        anyOf: [{ type: string, items: { $ref: string } }, { type: string }];
        description: string;
        title: string
    } | {
        default: number;
        examples: [number];
        anyOf: [{ exclusiveMaximum: number, exclusiveMinimum: number, type: string }, { type: string }];
        description: string;
        title: string
    } | {
        default: string;
        examples: [string];
        anyOf: [{ $ref: string }, { type: string }];
        description: string;
        title: string
    } | {
        allOf: [{ $ref: string }];
        examples: [{ geometry: { coordinates: [[number[][]]], type: string }, type: string, properties: {} }];
        description: string;
        title: string
    }) {

        let returnRange = {
            min: '1970-01-01',
            max: new Date().toISOString().substring(0, 10).replace("T", " ")
        }
        // @ts-ignore
        if (value['exclusiveMaximum'] || value['Maximum']) {
            // @ts-ignore
            returnRange.max = value['exclusiveMaximum'] || value['Maximum']
        }
        // @ts-ignore
        if (value['exclusiveMinimum'] || value['Minimum']) {
            // @ts-ignore
            returnRange.min = value['exclusiveMinimum'] || value['Minimum']
        }

        return returnRange
    }

    private requestCompute(model: any) {
        this.pluginService.computePlugin(this.pluginId, model).subscribe({
            next: (data) => {
                console.log('response from /plugin ', data)
                this.pluginService.storeComputeIds(data)
                this.toastService.show({
                    title: `${this.pluginId} parameters are send to process!`,
                    body: `Result from plugin execution will be listing on the dashboard`,
                    type: 'success',
                    time: 4000
                })
                setTimeout(() => {
                    this.router.navigate(['dashboard']);
                }, 1000)

            },
            error: error => {
                console.error('Error while request to compute plugin:', error);
                this.toastService.show({
                    title: `Error while computing plugin ${this.pluginId}`,
                    body: `Error while computing plugin ${this.pluginId}`,
                    type: 'error',
                    time: 4000
                })
            }
        });
    }

    /**
     * Check for 'required' fields are been entered by user
     *
     * @param model
     * @param schema
     * @private
     */
    private checkForRequiredFields(model: any, schema: any): boolean {
        // console.log('>>> checkForRequiredFields ', model, schema)
        if (!schema['required']) return true;

        const requiredList: String[] = schema['required']
        return requiredList.every((i) => model.hasOwnProperty(i))

    }
}
