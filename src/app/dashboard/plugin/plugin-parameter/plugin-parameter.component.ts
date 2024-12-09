import {Component, Input, OnChanges, ViewEncapsulation, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core'
import {CommonModule} from '@angular/common'
import {NgIf} from '@angular/common'
import {Router} from '@angular/router'
import {FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms'
import {FormlyFieldConfig, FormlyFormOptions, FormlyModule} from '@ngx-formly/core'
import {JSONSchema7, JSONSchema7Definition} from 'json-schema'
import {PluginService} from '../plugin.service'
import {MapService} from '../../map/map.service'
import {MatSnackBar} from '@angular/material/snack-bar'
import {ComputeRequest, Plugin} from '../plugin.interface'
import {
    FormlyModel,
    SelectOption,
    SelectOptions,
    ValidationProperty,
    ValidatorOptions
} from './plugin-parameter.interface'
import {FormlyFieldProps} from '@ngx-formly/core/lib/models/fieldconfig'
import {Subscription, fromEventPattern} from 'rxjs'
import moment from 'moment/moment'
import {LucideAngularModule, CirclePlay, MapPinPlusInside, TriangleAlert, CircleAlert} from 'lucide-angular'
import {getArea} from 'ol/sphere'
import Feature from 'ol/Feature'

@Component({
    selector: 'app-plugin-parameter',
    templateUrl: './plugin-parameter.component.html',
    styleUrls: ['./plugin-parameter.component.scss'],
    imports: [
        FormlyModule,
        FormsModule,
        ReactiveFormsModule,
        NgIf,
        LucideAngularModule,
        CommonModule
    ],
    standalone: true,
    encapsulation: ViewEncapsulation.None
})
export class PluginParameterComponent implements OnInit, OnChanges, OnDestroy {

    @Input() schema!: JSONSchema7
    @Input() plugin!: Plugin

    aoiAttribute: string | undefined = undefined
    selectedRegions: {name: string; area: number; feature: Feature}[] = []
    selectOptions: SelectOptions = {}
    form: FormGroup = new FormGroup({})
    fields: FormlyFieldConfig[] = []
    model: FormlyModel = {}
    options: FormlyFormOptions = {}

    static readonly sqmToSqkmFactor = 1 / 1000000

    readonly CirclePlay = CirclePlay
    readonly MapPinPlusInside = MapPinPlusInside
    readonly TriangleAlert = TriangleAlert
    readonly CircleAlert = CircleAlert

    jsonSchema_polygon = 'MultiPolygon'

    areaSelected = false
    highlightedFeaturesSubscription: Subscription | undefined

    constructor(private pluginService: PluginService,
                private snackBar: MatSnackBar,
                private router: Router,
                private mapService: MapService,
                private cdr: ChangeDetectorRef) {

                    const highlightedFeaturesAddObservable = fromEventPattern(
                        (handler) => this.mapService.highlightedFeatures.on('add', handler)
                    )

                    this.highlightedFeaturesSubscription = highlightedFeaturesAddObservable.subscribe(() => {
                        this.toggleFormState()
                        this.showSelectedAreaInfo()
                    })
    }

    ngOnInit(): void {
        this.form.disable()
    }

    ngOnChanges(): void {
        const schema = this.plugin.operator_schema
        if (!schema)
            return

        this.aoiAttribute = this.getAoiAttribute(schema)
        this.selectOptions = this.parseSelectOptions(schema.$defs)

        this.fields = this.parseFields(schema)
        Promise.resolve().then(() => {
            this.toggleFormState()
        })
    }

    onSubmit(model: FormlyModel) {
        if (this.form.valid) {
            this.requestCompute(model)
        }
    }

    ngOnDestroy() {
        if (this.highlightedFeaturesSubscription) {
            this.highlightedFeaturesSubscription.unsubscribe()
        }
    }

    showSelectedAreaInfo(): void {
        const selectedRegions = this.mapService.highlightedFeatures.getArray()
        this.selectedRegions = selectedRegions.map(feature => {
            const geometry = feature.getGeometry()
            
            return {
                name: feature.get('name') || 'Unnamed Region',
                area: geometry ? Number((getArea(geometry) * PluginParameterComponent.sqmToSqkmFactor).toFixed(2)) : 0,
                feature: feature
            }
        })
    }

    deselectRegion(region: { name: string; area: number; feature: Feature }): void {
        this.mapService.highlightedFeatures.remove(region.feature)
        this.selectedRegions = this.selectedRegions.filter(r => r !== region)
        
        if (this.selectedRegions.length === 0) {
            this.toggleFormState()
        }
    }

    toggleFormState(): void {
        if (this.mapService.highlightedFeatures.getLength() > 0) {
            this.form.enable()
            this.areaSelected = true
        } else {
            this.form.disable()
            this.areaSelected = false
        }
        this.cdr.detectChanges()
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
        const aoi = this.mapService.getSelectedRegion()
        const aoiName = aoi.properties?.name
        
        if (!aoi) {
            this.snackBar.open(
                'Please select an area on the map first.', 
                'Dismiss', 
                {
                    verticalPosition: 'bottom',
                    horizontalPosition: 'center',
                    panelClass: ['error-snackbar']
                }
            )
            return
        }

        const computeRequest: ComputeRequest = {
            aoi: aoi,
            params: {} as Record<string, unknown>
        }

        Object.entries(model).forEach(([key, value]) => {
            if (key !== 'aoi') {
                computeRequest.params[key] = value
            }
        })

        this.pluginService.computePlugin(this.plugin.plugin_id, computeRequest).subscribe({
            next: (data) => {
                this.pluginService.storeNewComputes(data.correlation_uuid, this.plugin, aoiName)
                this.pluginService.triggerSyncTasks()
                this.pluginService.setPluginState('inactive')
    
                this.snackBar.open(
                    'Compute request sent, results will be displayed soon.', 
                    'Dismiss',
                    {
                        duration: 7000,
                        verticalPosition: 'bottom',
                        horizontalPosition: 'center',
                        panelClass: ['success-snackbar']
                    }
                )
            },
            error: () => {
                this.snackBar.open(
                    'Error while computing plugin. Please try again.', 
                    'Dismiss', 
                    {
                        verticalPosition: 'bottom',
                        horizontalPosition: 'center',
                        panelClass: ['error-snackbar']
                    }
                )
            }
        })
    }

    parseDate(value: moment.Moment): string {
        if (moment.isMoment(value)) {
            return value.format('YYYY-MM-DD')
        } else if (moment(value, 'YYYY-MM-DD', true).isValid()) {
            return value
        } else {
            return value
        }
    }
}
