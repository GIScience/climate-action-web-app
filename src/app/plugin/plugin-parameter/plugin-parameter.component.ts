import {AfterViewInit, Component, Inject, Input, OnChanges, ViewEncapsulation} from '@angular/core'
import {Router} from '@angular/router'
import {FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms'
import {FormlyFieldConfig, FormlyFormOptions, FormlyModule} from '@ngx-formly/core'
import {JSONSchema7, JSONSchema7Definition} from 'json-schema'
import Map from 'ol/Map'
import OSM from 'ol/source/OSM'
import Cluster from 'ol/source/Cluster'
import Point from 'ol/geom/Point'
import TileLayer from 'ol/layer/Tile'
import {Collection, Feature, View} from 'ol'
import FeatureLike from 'ol/Feature'
import {fromLonLat} from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import {Geometry} from 'ol/geom.js'
import {PluginService} from '../plugin.service'
import {TuiAlertService, TuiButtonModule} from '@taiga-ui/core'
import {Plugin} from '../plugin.interface'
import {
    FormlyModel,
    SelectOption,
    SelectOptions,
    ValidationProperty,
    ValidatorOptions
} from './plugin-parameter.interface'
import {FormlyFieldProps} from '@ngx-formly/core/lib/models/fieldconfig'
import GeoJSON from 'ol/format/GeoJSON.js'
import {GeoJSONFeatureCollection} from 'ol/format/GeoJSON'
import moment from 'moment/moment'
import {createEmpty, extend, getCenter} from 'ol/extent'
import {Circle as CircleStyle, Fill, Stroke, Style, Text} from 'ol/style'


@Component({
    selector: 'app-plugin-parameter',
    templateUrl: './plugin-parameter.component.html',
    styleUrls: ['./plugin-parameter.component.scss'],
    imports: [
        FormlyModule,
        FormsModule,
        ReactiveFormsModule,
        TuiButtonModule
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
    regionLayer: VectorLayer<Feature<Geometry>> | undefined
    clusterLayer: VectorLayer<Feature<Geometry>> | undefined
    highlightedFeatures: Collection<FeatureLike> = new Collection([])
    styleCache: { [key: number]: Style } = {}
    jsonSchema_polygon = 'MultiPolygon'

    constructor(private pluginService: PluginService,
                @Inject(TuiAlertService) private readonly alerts: TuiAlertService,
                private router: Router) {
    }


    ngOnChanges(): void {
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

    getSelectedRegion(): GeoJSONFeatureCollection {
        const feature = this.highlightedFeatures.item(0)
        if (feature) {
            if (!feature.get('id')) {
                feature.set('id', Math.random().toString(36).substring(2, 9))
            }
            if (!feature.get('name')) {
                feature.set('name', 'Unnamed Region')
            }
            return new GeoJSON().writeFeatureObject(feature, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
                decimals: 7
            })
        }

    }

    parseFields(schema: JSONSchema7): FormlyFieldConfig[] {
        if (!schema.properties)
            return []

        const fields: FormlyFieldConfig[] = []
        const optionalSubgroup: FormlyFieldConfig[] = []

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
                field.validators = this.getValidators(value)
                field.parsers = this.getParsers(value)

                if (schema.required && schema.required.includes(key)) {
                    field.props.required = true
                    fields.push(field)
                } else {
                    optionalSubgroup.push(field)
                }
            }
        }

        if (optionalSubgroup.length > 0) {
            fields.push({
                type: 'expander',
                fieldGroup: [
                    {
                        props: {
                            label: 'Optional Attributes',
                            description: 'Click here to access more configurations.'
                        },
                        fieldGroup: optionalSubgroup
                    }
                ]
            })
        }

        return fields
    }

    private parseType(property: JSONSchema7): string {
        switch (property.type) {
            case 'boolean':
                return 'checkbox'
            case 'integer':
            case 'number':
                return 'input'
            case 'string':
                if (property['format'] === 'date') {
                    return 'datepicker'
                } else {
                    return 'input'
                }
            case 'array':
                if (property.items) {
                    return 'select'
                }
                console.error('Wrong format in multi-select schema, "items" missing.')
                return 'textarea'
            case undefined:
                if (property.$ref) {
                    return 'select'
                }
                console.error('Wrong format in select schema, "$ref" missing.')
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
            case 'string':
                if (property['format'] === 'date') {
                    const minMax = this.checkForMinAndMaxDateRange(property)
                    Object.assign(props, {
                        datepickerOptions: {
                            startAt: props.placeholder,
                            min: minMax.min,
                            max: minMax.max
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

    private getValidators(property: JSONSchema7): ValidationProperty {
        switch (property.type) {
            case 'integer':
                return {validation: [{name: 'intType', options: this.checkForMinAndMaxRange(property)}]}
            case 'number':
                return {validation: [{name: 'numType', options: this.checkForMinAndMaxRange(property)}]}
            case 'string':
                if (property['format'] === 'date') {
                    return {validation: [{name: 'dateType', options: this.checkForMinAndMaxDateRange(property)}]}
                }
        }
        return {'validation': []}
    }

    private getParsers(property: JSONSchema7) {
        if (property.type === 'string' && property['format'] === 'date') {
            return [this.parseDate]
        }
        return []
    }

    getAoiAttribute(schema: JSONSchema7): string | undefined {
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


    parseSelectOptions($defs: { [p: string]: JSONSchema7Definition } | undefined): SelectOptions {
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
        this.assembleMap()
    }

    private assembleMap(clusterToPolygonSwitchZoom = 7) {
        const selectedRegionLayer = this.initLayers(clusterToPolygonSwitchZoom)
        this.initMap(selectedRegionLayer)
    }

    private initLayers(clusterToPolygonSwitchZoom: number) {
        const ROISource = new VectorSource({
            format: new GeoJSON(),
            url: 'assets/geodata/regions-of-interest.json'
        })

        const clusterSource = new Cluster({
            source: ROISource,
            // @ts-ignore docs say null can be returned!
            geometryFunction: function (feature) {
                const geom = feature.getGeometry()
                if (!geom)
                    return null
                return new Point(getCenter(geom.getExtent()))
            }
        })

        this.regionLayer = new VectorLayer({
            minZoom: clusterToPolygonSwitchZoom,
            source: ROISource,
            style: new Style({
                fill: new Fill({color: 'rgba(0, 0, 255, 0.1)'}),
                stroke: new Stroke({color: 'blue', width: 2})
            })
        })

        const selectedRegionLayer = new VectorLayer({
            source: new VectorSource({
                features: this.highlightedFeatures
            }),
            map: this.map,
            style: {
                'stroke-color': 'rgba(255, 0, 0, 0.7)',
                'stroke-width': 2
            }
        })

        this.clusterLayer = new VectorLayer({
            maxZoom: clusterToPolygonSwitchZoom,
            source: clusterSource,
            //@ts-ignore typechecker error: FeatureLike down-typed to Feature<Geometry>
            style: (clusterFeature, resolution) => this.getClusterStyle(clusterFeature, resolution)
        })
        return selectedRegionLayer
    }

    private initMap(selectedRegionLayer: VectorLayer<FeatureLike>) {
        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM()
                })
            ],
            target: 'map',
            view: new View({
                center: fromLonLat([8.6759928, 49.4187355]),
                zoom: 0
            })
        })
        if (this.regionLayer) {
            this.map.addLayer(this.regionLayer)
        }
        
        if (this.clusterLayer) {
            this.map.addLayer(this.clusterLayer)
        }
        this.map.addLayer(selectedRegionLayer)

        this.map.on('pointermove', evt => {
            if (this.map && !evt.dragging) {
                this.map.getTargetElement().style.cursor = this.map.hasFeatureAtPixel(this.map.getEventPixel(evt.originalEvent)) ? 'pointer' : ''
            }
        })

        this.map.on('click', (evt) => {
            if (this.clusterLayer && this.clusterLayer.isVisible()) {
                this.zoomToCluster(evt.pixel)
            } else {
                this.selectRegions(evt.pixel)
            }
        })
    }

    private getClusterStyle(clusterFeature: FeatureLike) {
        const size: number = clusterFeature.get('features').length
        let style = this.styleCache[size]
        if (!style) {
            style = new Style({
                image: new CircleStyle({
                    radius: 15,
                    stroke: new Stroke({color: 'blue', width: 2}),
                    fill: new Fill({color: 'rgba(0, 0, 255, 0.5)'})
                }),
                text: new Text({
                    text: size.toString(),
                    font: 'bold 14px sans-serif',
                    textAlign: 'center',
                    textBaseline: 'middle',
                    fill: new Fill({
                        color: '#fff'
                    })
                })
            })
            this.styleCache[size] = style
        }
        return style
    }

    private zoomToCluster(pixel: Array<number>) {
        if (this.clusterLayer) {
            this.clusterLayer.getFeatures(pixel).then((clickedFeatures) => {
                if (clickedFeatures.length) {
                    const extent = createEmpty()
                    const features: Feature[] = clickedFeatures[0].get('features')
                    features.forEach(f => {
                        const geometry = f.getGeometry()
                        if (geometry) {
                            extend(extent, geometry.getExtent())
                        }
                    })
                    if (this.map) {
                        this.map.getView().fit(extent, {duration: 1000, padding: [100, 100, 100, 100]})
                    }
                }
            })
        }
    }

    private selectRegions(pixel: Array<number>) {
        if (this.regionLayer) {
            this.regionLayer.getFeatures(pixel).then((features) => {
                if (features && features[0]) {
                    this.highlightedFeatures.clear()
                    this.highlightedFeatures.push(features[0] as Feature<Geometry>)
                }
            })
        }
    }

    private checkForMinAndMaxRange(value: JSONSchema7): ValidatorOptions {
        return {
            min: value.minimum ?? value.exclusiveMinimum ?? Number.NEGATIVE_INFINITY,
            max: value.maximum ?? value.exclusiveMaximum ?? Number.POSITIVE_INFINITY
        }
    }

    private checkForMinAndMaxDateRange(value: JSONSchema7): ValidatorOptions {
        return {
            min: String(value.minimum ?? value.exclusiveMinimum ?? '1970-01-01'),
            max: String(value.maximum ?? value.exclusiveMaximum ?? new Date().toISOString().split('T')[0])
        }
    }

    private requestCompute(model: FormlyModel) {
        this.pluginService.computePlugin(this.plugin.plugin_id, model).subscribe({
            next: (data) => {
                this.pluginService.storeComputes(data.correlation_uuid, this.plugin)

                this.alerts
                    .open('Result from plugin execution will be listed on the dashboard.', {
                        label: `${this.plugin.plugin_id}` + ' parameters are sent for processing!',
                        status: 'success',
                        autoClose: 7000
                    })
                    .subscribe()
                this.router.navigate(['dashboard'])
            },
            error: () => {
                this.alerts
                    .open('Please try again.', {
                        label: 'Error while computing plugin ' + `${this.plugin.name}`,
                        status: 'error',
                        autoClose: 7000
                    })
                    .subscribe()
                this.router.navigate(['dashboard'])
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
            aoiBody = 'Don\'t forget to choose an area on the map.'
            missingFields = missingFields.filter(e => e !== this.aoiAttribute)
        }

        const body: string[] = []
        if (missingFields[0])
            body.push(`Please enter values to the required fields "${missingFields.join(' and ')}"`)
        if (aoiBody)
            body.push(aoiBody)

        this.alerts
            .open(body.join(' and '), {label: 'Required fields empty!', status: 'warning', autoClose: 7000})
            .subscribe()

    }

    parseDate(value: moment.Moment): string {
        if (moment.isMoment(value)) {
            return value.format('YYYY-MM-DD')
        } else if (moment(value, 'YYYY-MM-DD', true).isValid()) {
            return value
        } else {
            console.error('Parsing date failed.')
            return value
        }
    }
}
