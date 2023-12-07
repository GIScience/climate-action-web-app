import {AfterViewInit, Component, Input, OnChanges, ViewEncapsulation} from '@angular/core'
import {Router} from '@angular/router'
import {FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms'
import {FormlyFieldConfig, FormlyFormOptions, FormlyModule} from '@ngx-formly/core'
import {JSONSchema7, JSONSchema7Definition} from 'json-schema';
import Map from 'ol/Map'
import OSM from 'ol/source/OSM'
import TileLayer from 'ol/layer/Tile'
import {View} from 'ol'
import {fromLonLat} from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import {Fill, Stroke, Style} from 'ol/style'

import {regions} from '../../support/region-of-interest'
import {FeatureLike} from 'ol/Feature.js'
import {Geometry} from 'ol/geom.js'
import {PluginService} from '../plugin.service'
import {ToastService} from '../../toast/toast.service'
import {Plugin} from '../plugin.interface'
import {FormlyModel, SelectOption, SelectOptions} from './plugin-parameter.interface'
import {FormlyFieldProps} from '@ngx-formly/core/lib/models/fieldconfig'
import GeoJSON from 'ol/format/GeoJSON.js'
import {GeoJSONFeatureCollection} from 'ol/format/GeoJSON'


@Component({
    selector: 'app-plugin-parameter',
    templateUrl: './plugin-parameter.component.html',
    styleUrls: ['./plugin-parameter.component.scss'],
    imports: [
        FormlyModule,
        FormsModule,
        ReactiveFormsModule
    ],
    standalone: true,
    encapsulation: ViewEncapsulation.None
})
export class PluginParameterComponent implements OnChanges, AfterViewInit {

    @Input() schema!: JSONSchema7
    @Input() plugin!: Plugin

    aoiAttribute: string | undefined = undefined
    selectOptions: SelectOptions = {}
    form: FormGroup = new FormGroup({})
    fields: FormlyFieldConfig[] = []
    model: FormlyModel = {}
    options: FormlyFormOptions = {}

    map: Map | undefined
    regionLayer: VectorLayer<VectorSource<Geometry>> | undefined
    selectedRegionLayer!: VectorLayer<VectorSource<Geometry>>
    jsonSchema_polygon = 'MultiPolygon'
    highlightedFeatures: Array<FeatureLike> = []

    constructor(private pluginService: PluginService,
                private toastService: ToastService,
                private router: Router) {
    }


    ngOnChanges(): void {
        if (this.options.resetModel)
            this.options.resetModel({})

        const schema = this.plugin.operator_schema
        if (!schema)
            return

        this.aoiAttribute = this.getAoiAttribute(schema)
        this.selectOptions = this.parseSelectOptions(schema.$defs)

        this.fields = this.parseFields(schema)
    }

    onSubmit(model: FormlyModel) {
        const selectedRegion = this.getSelectedRegion()
        if (this.aoiAttribute && selectedRegion)
            model[this.aoiAttribute] = selectedRegion

        const missingFields = this.checkForRequiredFields(model)
        if (missingFields.length == 0) {
            this.requestCompute(model)
        } else {
            this.alertUserMissingFields(missingFields)
        }

    }

    private getSelectedRegion(): GeoJSONFeatureCollection {
        const features = this.selectedRegionLayer.getSource()?.getFeatures()
        if (features && features[0]) {
            const paramFeature = new GeoJSON().writeFeaturesObject(features, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
            return paramFeature.features[0]
        }

    }

    private parseFields(schema: JSONSchema7): FormlyFieldConfig[] {
        if (!schema.properties)
            return []

        const fields: FormlyFieldConfig[] = []

        for (const [key, value] of Object.entries(schema.properties)) {
            if (typeof value != 'boolean') {
                if (value.anyOf) {
                    value.anyOf.forEach((nullable) => {
                        if (typeof nullable != 'boolean' && nullable.type != 'null') {
                            Object.assign(value, nullable)
                        }
                    })
                }
                const field: FormlyFieldConfig = {}
                field.key = key
                field.type = this.parseType(value)
                field.props = this.parseProps(value)

                if (schema.required && schema.required.includes(key))
                    field.props.required = true

                fields.push(field)
            }
        }

        return fields
    }

    private parseType(property: JSONSchema7): string {
        switch (property.type) {
            case 'boolean':
            case 'number':
            case 'integer':
                return property.type
            case 'string':
                if (property['format'] === 'date') {
                    return 'datepicker'
                } else {
                    return 'input'
                }
            case undefined:
                if (property.$ref) {
                    return 'select'
                }
                console.error('Wrong format in select schema, "$ref" missing.')
                return 'textarea'
            case 'array':
                if (property.items) {
                    return 'select'
                }
                console.error('Wrong format in multi-select schema, "items" missing.')
                return 'textarea'
            default:
                console.error(`Unexpected plugin parameter type: ${property.type} in ${property.title}`)
                return 'textarea'
        }
    }

    private parseProps(property: JSONSchema7): FormlyFieldProps {
        const props: FormlyFieldProps = {}

        props.label = property.title
        props.description = property.description

        if (property.examples && Array.isArray(property.examples) && property.examples.length > 0) {
            props.placeholder = String(property.examples[0])
        }

        switch (property.type) {
            case 'number':
            case 'integer':
                Object.assign(props, this.checkForMinAndMaxRange(property))
                break
            case 'string':
                if (property['format'] === 'date') {
                    Object.assign(props, this.checkForMinAndMaxDateRange(property))
                    Object.assign(props, {
                        datepickerOptions: {
                            max: new Date()
                        }
                    })
                }
                break
            case 'array':
                // @ts-ignore typing definition incomplete
                props.multiple = true
                if (property.items && typeof property.items != 'boolean' && !Array.isArray(property.items)) {
                    props.options = this.selectOptions[this.getRefName(property.items.$ref)]
                }
                break
            case undefined:
                if (property.$ref) {
                    props.placeholder = 'Choose' //select placeholder is effectively default
                    props.options = this.selectOptions[this.getRefName(property.$ref)]
                }
        }
        return props
    }

    private getAoiAttribute(schema: JSONSchema7): string | undefined {
        if (!schema.properties)
            return

        for (const [key, value] of Object.entries(schema.properties)) {
            if (typeof value != 'boolean' && value && value.allOf && typeof value.allOf[0] != 'boolean' && value.allOf[0].$ref && value.allOf[0].$ref.includes(this.jsonSchema_polygon)) {
                delete schema.properties[key]
                return key
            }
        }
        return
    }


    private parseSelectOptions($defs: { [p: string]: JSONSchema7Definition } | undefined): SelectOptions {
        const transformedDefs: SelectOptions = {}
        if (!$defs)
            return transformedDefs

        for (const [key, value] of Object.entries($defs)) {
            if (typeof value != 'boolean' && value.enum && !key.includes(this.jsonSchema_polygon)) {
                const option: SelectOption[] = []
                value.enum.forEach(value => {
                    option.push({label: String(value), value: value})
                })
                transformedDefs[key] = option
            }
        }

        return transformedDefs
    }

    private getRefName($ref: string | undefined): string {
        if (!$ref)
            return ''
        return $ref.replace('#/$defs/', '')
    }

    ngAfterViewInit(): void {
        this.initMap()
    }

    private initMap() {
        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM()
                })
            ],
            target: 'map',
            view: new View({
                center: fromLonLat([8.6759928, 49.4187355]),
                zoom: 10
            })
        })

        this.selectedRegionLayer = new VectorLayer({
            source: new VectorSource(),
            map: this.map,
            style: {
                'stroke-color': 'rgba(255, 0, 0, 0.7)',
                'stroke-width': 2
            }
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
                    const selIndex = this.highlightedFeatures.indexOf(feature)
                    if (selIndex < 0) {
                        if (feature) {
                            this.highlightedFeatures.push(feature)
                        }
                    } else {
                        this.highlightedFeatures.splice(selIndex, 1)
                    }

                    this.selectedRegionLayer.getSource()?.clear()
                    if (this.highlightedFeatures.length > 0) {
                        // @ts-ignore TODO possible type mismatch
                        this.selectedRegionLayer.getSource().addFeatures(this.highlightedFeatures)
                    }
                }
            })
        }
    }

    private checkForMinAndMaxRange(value: JSONSchema7) {
        return {
            minimum: value.exclusiveMaximum || Number.NEGATIVE_INFINITY,
            maximum: value.exclusiveMinimum || Number.POSITIVE_INFINITY
        }
    }

    private checkForMinAndMaxDateRange(value: JSONSchema7) {
        const today = new Date().toISOString().substring(0, 10).replace('T', ' ')
        return {
            min: value.exclusiveMaximum || '1970-01-01',
            max: value.exclusiveMinimum || today
        }
    }

    private requestCompute(model: FormlyModel) {
        this.pluginService.computePlugin(this.plugin.plugin_id, model).subscribe({
            next: (data) => {
                this.pluginService.storeComputes(data.correlation_uuid, this.plugin)
                this.toastService.next({
                    title: `${this.plugin.plugin_id} parameters are send to process!`,
                    body: 'Result from plugin execution will be listing on the dashboard',
                    type: 'success',
                    time: 5000
                })
                setTimeout(() => {
                    this.router.navigate(['dashboard'])
                }, 1000)

            },
            error: error => {
                console.error('Error while request to compute plugin:', error)
                this.toastService.next({
                    title: `Error while computing plugin ${this.plugin.name}`,
                    body: `Error while computing plugin ${this.plugin.name}`,
                    type: 'error',
                    time: 5000
                })
            }
        })
    }

    private checkForRequiredFields(model: FormlyModel): string[] {
        const required = this.schema.required
        if (!required) return []
        let missingFields: string[] = required.filter(key => !Object.keys(model).includes(key))

        missingFields = missingFields.map(key => {
            if (this.schema.properties && key != this.aoiAttribute) {
                const property = this.schema.properties[key]
                if (property && typeof property != 'boolean') {
                    if (property.title)
                        return property.title
                }
            }
            return key
        })
        return missingFields
    }

    private alertUserMissingFields(missingFields: string[]) {
        let aoiBody = ''
        if (this.aoiAttribute && missingFields.includes(this.aoiAttribute)) {
            aoiBody = 'don\'t forget to choose an area on the map.'
            missingFields = missingFields.filter(e => e !== this.aoiAttribute)
        }

        const body: string[] = []
        if (missingFields[0])
            body.push(`Please enter values to the required fields "${missingFields.join(' and ')}"`)
        if (aoiBody)
            body.push(aoiBody)

        this.toastService.next({
            title: 'Required fields empty!',
            body: body.join(' and '),
            type: 'error',
            time: 4000
        })

    }
}
