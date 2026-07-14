import { CommonModule } from '@angular/common'
import {
    Component,
    ElementRef,
    inject,
    Input,
    NgZone,
    OnChanges,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewEncapsulation
} from '@angular/core'
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter'
import { MAT_DATE_LOCALE } from '@angular/material/core'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import {
    constValidationMessage,
    exclusiveMaximumValidationMessage,
    exclusiveMinimumValidationMessage,
    maxItemsValidationMessage,
    maxLengthValidationMessage,
    maxValidationMessage,
    minItemsValidationMessage,
    minLengthValidationMessage,
    minValidationMessage,
    multipleOfValidationMessage,
    typeValidationMessage
} from '@app/app.validation-messages'
import { AppwriteService } from '@app/auth/appwrite.service'
import { ComputationRunState } from '@app/dashboard/common/status.types'
import { ComputationDatabaseEntity } from '@app/dashboard/computations-index/computation.interface'
import { Extent, MapService } from '@app/dashboard/map/map.service'
import { MapGeoJsonUtils } from '@app/dashboard/map/utils/map-geojson.utils'
import {
    ComputeRequest,
    DrawInput,
    ExternalInput,
    GeometryInputMode,
    Plugin
} from '@app/dashboard/plugin/plugin.interface'
import { PluginService } from '@app/dashboard/plugin/plugin.service'
import { OptionalAttributesTypeComponent } from '@app/types/dialog/optional-attributes'
import { ObjectTypeComponent } from '@app/types/object/object.type'
import { reactiveDateFnsLocale, updateActiveDateFnsLocale } from '@app/utils/locale.utils'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import { TippyDirective } from '@ngneat/helipopper'
import { FormlyFieldConfig, FormlyForm, FormlyFormOptions, provideFormlyCore } from '@ngx-formly/core'
import { FormlyJsonschema } from '@ngx-formly/core/json-schema'
import { withFormlyMaterial } from '@ngx-formly/material'
import { withFormlyFieldDatepicker } from '@ngx-formly/material/datepicker'
import bbox from '@turf/bbox'
import { buffer } from '@turf/buffer'
import { Models } from 'appwrite'
import { format, isValid } from 'date-fns'
import type { GeoJSON, Feature as GeoJSONFeature, GeoJsonTypes } from 'geojson'
import { JSONSchema7, JSONSchema7Definition } from 'json-schema'
import {
    CircleAlert,
    CircleDot,
    CirclePlay,
    CircleX,
    File,
    Info,
    LucideAngularModule,
    MapPinPlusInside,
    Pentagon,
    Square,
    Trash2,
    TriangleAlert,
    UserCheck
} from 'lucide-angular'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ToastrService } from 'ngx-toastr'
import { Subscription } from 'rxjs'
import { EnumOption, FormlyModel } from './plugin-parameter.interface'

@Component({
    selector: 'app-plugin-parameter',
    templateUrl: './plugin-parameter.component.html',
    styleUrls: ['./plugin-parameter.component.scss'],
    imports: [
        FormlyForm,
        FormsModule,
        ReactiveFormsModule,
        LucideAngularModule,
        CommonModule,
        NgScrollbarModule,
        TippyDirective,
        TranslocoModule,
        MatFormFieldModule,
        MatInputModule
    ],
    providers: [
        provideFormlyCore([
            {
                validationMessages: [
                    { name: 'required', message: 'This field is required' },
                    { name: 'type', message: typeValidationMessage },
                    { name: 'minLength', message: minLengthValidationMessage },
                    { name: 'maxLength', message: maxLengthValidationMessage },
                    { name: 'min', message: minValidationMessage },
                    { name: 'max', message: maxValidationMessage },
                    { name: 'multipleOf', message: multipleOfValidationMessage },
                    { name: 'exclusiveMinimum', message: exclusiveMinimumValidationMessage },
                    { name: 'exclusiveMaximum', message: exclusiveMaximumValidationMessage },
                    { name: 'minItems', message: minItemsValidationMessage },
                    { name: 'maxItems', message: maxItemsValidationMessage },
                    { name: 'uniqueItems', message: 'should NOT have duplicate items' },
                    { name: 'const', message: constValidationMessage },
                    { name: 'enum', message: `must be equal to one of the allowed values` },
                    { name: 'date', message: 'not a valid date' }
                ],
                types: [
                    { name: 'object', component: ObjectTypeComponent },
                    { name: 'dialog', component: OptionalAttributesTypeComponent, wrappers: [] }
                ]
            },
            ...withFormlyMaterial(),
            withFormlyFieldDatepicker()
        ]),
        provideDateFnsAdapter({
            parse: {
                dateInput: 'yyyy-MM-dd'
            },
            display: {
                dateInput: 'PP',
                monthYearLabel: 'LLL yyyy',
                dateA11yLabel: 'PP',
                monthYearA11yLabel: 'LLLL yyyy'
            }
        }),
        {
            provide: MAT_DATE_LOCALE,
            deps: [TranslocoService],
            useFactory: (transloco: TranslocoService) => {
                updateActiveDateFnsLocale(transloco.getActiveLang())
                return reactiveDateFnsLocale
            }
        }
    ],
    encapsulation: ViewEncapsulation.None
})
export class PluginParameterComponent implements OnInit, OnChanges, OnDestroy {
    private pluginService = inject(PluginService)
    private toastr = inject(ToastrService)
    mapService = inject(MapService)
    private ngZone = inject(NgZone)
    private formlyJsonschema = inject(FormlyJsonschema)
    private appwriteService = inject(AppwriteService)
    private translocoService = inject(TranslocoService)

    @Input() schema!: JSONSchema7
    @Input() plugin!: Plugin

    @ViewChild('aoiFile') private aoiFileInput?: ElementRef<HTMLInputElement>
    @ViewChild('areaLabelInput', { read: ElementRef }) private areaLabelInput?: ElementRef<HTMLInputElement>

    form: FormGroup = new FormGroup({})
    fields: FormlyFieldConfig[] = []
    model: FormlyModel = {}
    options: FormlyFormOptions = {}

    user: Models.User<Models.Preferences> | null = null

    readonly CirclePlay = CirclePlay
    readonly MapPinPlusInside = MapPinPlusInside
    readonly TriangleAlert = TriangleAlert
    readonly CircleAlert = CircleAlert
    readonly UserCheck = UserCheck
    readonly CircleX = CircleX
    readonly CircleDot = CircleDot
    readonly Square = Square
    readonly Pentagon = Pentagon
    readonly File = File
    readonly Trash2 = Trash2
    readonly Info = Info
    readonly ExternalInput = ExternalInput
    readonly DrawInput = DrawInput

    areaSelected = false
    areaGeomType: GeoJsonTypes | undefined
    highlightedFeaturesSubscription: Subscription | undefined
    currentSelectionMode: GeometryInputMode = ExternalInput.Boundary
    areaLabelControl = new FormControl('')
    private hadSelection = false

    private bufferSourceFeature?: GeoJSONFeature
    protected readonly defaultBufferRadius = 10

    constructor() {
        this.highlightedFeaturesSubscription = this.mapService.selectedFeatures$.subscribe(() => {
            this.ngZone.run(() => {
                const hadSelection = this.hadSelection
                this.toggleFormState()
                this.hadSelection = this.areaSelected

                if (this.areaSelected && !hadSelection && this.currentSelectionMode !== ExternalInput.Boundary) {
                    this.focusAreaLabel()
                }
            })
        })

        this.appwriteService._user.subscribe(user => {
            this.user = user
        })
    }

    ngOnInit(): void {
        this.form.disable()
        this.mapService.enableBoundarySelection()
    }

    ngOnChanges(): void {
        this.fields = this.parseFieldsFromSchema(this.plugin.operator_schema)
        Promise.resolve().then(() => {
            this.toggleFormState()
        })
    }

    onSubmit(model: FormlyModel) {
        if (this.user && this.form.valid) {
            this.requestCompute(model)
        }
    }

    ngOnDestroy() {
        if (this.highlightedFeaturesSubscription) {
            this.highlightedFeaturesSubscription.unsubscribe()
        }
        if (this.currentSelectionMode !== ExternalInput.Boundary) {
            this.mapService.clearDrawnFeatures()
        }
        this.mapService.stopDrawing()
    }

    resetForm(): void {
        this.form.reset()
        this.mapService.clearDrawnFeatures()
        this.bufferSourceFeature = undefined
        this.areaLabelControl.setValue('')
        if (this.isDrawMode(this.currentSelectionMode)) {
            this.mapService.startDrawing(this.currentSelectionMode)
        } else if (this.currentSelectionMode === ExternalInput.File) {
            this.resetFileInput()
        }
        this.toastr.info(this.translocoService.translate('pluginParameter.allSelectionsCleared'), '', {
            timeOut: 4000
        })
    }

    toggleFormState(): void {
        this.areaSelected = this.mapService.selectedFeatures.length > 0
        this.areaGeomType = this.mapService.selectedFeatures[0]?.geometry.type

        if (this.areaSelected === this.form.enabled) {
            return
        }

        if (this.areaSelected && this.areaGeomType?.includes('Polygon')) {
            this.form.enable()
        } else {
            this.form.disable()
        }
    }

    parseFieldsFromSchema(schema: JSONSchema7): FormlyFieldConfig[] {
        const options = { map: this.custom_field_transformer }
        return [this.formlyJsonschema.toFieldConfig(schema, options)]
    }

    private custom_field_transformer(field: FormlyFieldConfig, schema: JSONSchema7): FormlyFieldConfig {
        function separateOptionalParameters(field: FormlyFieldConfig, schema: JSONSchema7): FormlyFieldConfig {
            // Within object groups, keep required fields visible and move optional ones
            // behind the "optional attributes" dialog subgroup when at least four exist
            const max_optional_parameters = 3
            if (!field.fieldGroup || field.fieldGroup.length <= max_optional_parameters) return field

            const splittedFieldGroup: FormlyFieldConfig[] = []
            const optionalSubgroup: FormlyFieldConfig[] = []

            field.fieldGroup.forEach((parsedField: FormlyFieldConfig) => {
                let fieldSchema: JSONSchema7Definition = {}
                if (schema.properties && typeof parsedField.key === 'string') {
                    fieldSchema = schema.properties[parsedField.key]
                }
                // @ts-ignore custom parameter that can be provided by the plugin devs but is not part of the official schema
                const forcePrimary: boolean = fieldSchema['x-mark-important']
                if (schema.required?.includes(String(parsedField.key)) || forcePrimary) {
                    splittedFieldGroup.push(parsedField)
                } else {
                    optionalSubgroup.push(parsedField)
                }
            })

            if (optionalSubgroup.length > 0) {
                splittedFieldGroup.push({
                    type: 'dialog',
                    fieldGroup: [
                        {
                            props: {
                                label: 'pluginParameter.optionalAttributes',
                                description: 'pluginParameter.editAdditionalParameters'
                            },
                            fieldGroup: optionalSubgroup
                        }
                    ]
                })
            }
            field.fieldGroup = splittedFieldGroup

            return field
        }

        // For object fields with a key, render them as dialogs in the parent form,
        // keeping their label and description for the dialog trigger
        function separateGroupedParameters(field: FormlyFieldConfig): FormlyFieldConfig {
            const originalFieldGroup = field.fieldGroup
            field.type = 'dialog'
            field.fieldGroup = [
                {
                    props: {
                        label: field.props?.label,
                        description: field.props?.description
                    },
                    fieldGroup: originalFieldGroup
                }
            ]
            return field
        }

        field.props = field.props || {}
        field.props['subscriptSizing'] = 'dynamic'

        if (schema.examples && Array.isArray(schema.examples)) {
            field.props.placeholder = String(schema.examples[0])
        }

        if (schema.format == 'date') {
            field.type = 'datepicker'
            field.parsers = [v => (v instanceof Date ? format(v, 'yyyy-MM-dd') : v)]
            field.validators = { date: (control: AbstractControl) => isValid(new Date(control.value)) }
        }

        if (field.type == 'enum') {
            let translations: { [key: string]: string } | undefined
            if (schema.type == 'array') {
                // @ts-ignore Custom tag to enable translation of select fields
                translations = schema.items['x-translation']
            } else {
                // @ts-ignore Custom tag to enable translation of select fields
                translations = schema['x-translation']
            }
            if (translations && field.props && field.props.options) {
                field.props.options = (field.props.options as Array<EnumOption>).map((option: EnumOption) => {
                    option.label = translations[option.label] || option.label
                    return option
                })
            }
        }

        field = separateOptionalParameters(field, schema)

        if (field.type === 'object' && field.key) {
            field = separateGroupedParameters(field)
        }
        return field
    }

    private requestCompute(model: FormlyModel) {
        const aoi = this.mapService.getSelectedRegion()
        if (this.currentSelectionMode !== ExternalInput.Boundary && aoi?.properties) {
            aoi.properties['name'] =
                this.areaLabelControl.value || this.translocoService.translate('pluginParameter.customArea')
        }
        const aoiName = aoi?.properties?.['name']

        if (!aoi) {
            this.toastr.warning(this.translocoService.translate('pluginParameter.pleaseSelectArea'), '', {
                timeOut: 4000
            })
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

        this.pluginService.computePlugin(this.plugin.id, computeRequest).subscribe({
            next: async data => {
                const compute: ComputationDatabaseEntity = {
                    correlation_uuid: data.correlation_uuid,
                    pluginId: this.plugin.id,
                    aoiName: aoiName,
                    status: 'PENDING' as ComputationRunState,
                    request_ts: new Date()
                }

                try {
                    await this.pluginService.storeNewComputes(compute)

                    this.pluginService.triggerSyncTasks()
                    this.pluginService.setComputeState('inactive')

                    this.toastr.info(this.translocoService.translate('pluginParameter.computeRequestSent'), '', {
                        timeOut: 7000
                    })
                } catch (error) {
                    console.error('Failed to store computation:', error)
                    this.toastr.error(
                        this.translocoService.translate('pluginParameter.errorWhileSubmittingYourRequest'),
                        '',
                        {
                            timeOut: 7000
                        }
                    )
                }
            },
            error: error => {
                switch (error.status) {
                    case 401:
                        this.toastr.error(this.translocoService.translate('pluginParameter.pleaseEnsureLoggedIn'), '', {
                            timeOut: 7000
                        })
                        break
                    case 403:
                        this.toastr.error(
                            this.translocoService.translate('pluginParameter.thereIsAnIssueWithYourAccount'),
                            '',
                            {
                                timeOut: 7000
                            }
                        )
                        break
                    case 422:
                        this.toastr.error(
                            this.translocoService.translate('pluginParameter.thereIsAnIssueWithYourSelectedArea'),
                            '',
                            {
                                timeOut: 7000
                            }
                        )
                        break
                    case 429:
                        this.toastr.error(
                            this.translocoService.translate('pluginParameter.youHaveReachedTheMaximumNumberOfRequests'),
                            '',
                            {
                                timeOut: 7000
                            }
                        )
                        break
                    default:
                        this.toastr.error(
                            this.translocoService.translate('pluginParameter.errorWhileSubmittingYourRequest'),
                            '',
                            {
                                timeOut: 7000
                            }
                        )
                        break
                }
            }
        })
    }

    getSelectedArea(): number {
        return (this.mapService.selectedFeatures[0]?.properties?.['area'] as number) ?? 0
    }

    hasValidAreaSelection(): boolean {
        const hasValidArea = this.mapService.selectedFeatures.length === 1

        if (this.currentSelectionMode !== ExternalInput.Boundary) {
            return hasValidArea && this.areaLabelControl.valid
        }

        return hasValidArea
    }

    setSelectionMode(mode: GeometryInputMode): void {
        const previousMode = this.currentSelectionMode
        this.currentSelectionMode = mode
        if (previousMode !== this.currentSelectionMode) {
            this.mapService.clearDrawnFeatures()
            this.bufferSourceFeature = undefined
            if (mode === ExternalInput.Boundary) {
                this.areaLabelControl.setValue('')
                this.setAreaNameRequired(false)
                this.mapService.stopDrawing()
                this.mapService.enableBoundarySelection()
            } else if (mode === ExternalInput.File) {
                this.setAreaNameRequired(true)
                this.mapService.disableBoundarySelection()
                this.mapService.stopDrawing()
            } else {
                this.setAreaNameRequired(true)
                this.mapService.disableBoundarySelection()
                this.mapService.startDrawing(mode)
            }
        }
    }

    private async parseAoiFileContent(fileName: string, data: string): Promise<GeoJSON> {
        const extension = fileName.slice(fileName.lastIndexOf('.'))
        switch (extension) {
            case '.gpx':
            case '.kml': {
                const { gpx, kml } = await import('@tmcw/togeojson')
                const dom = new DOMParser().parseFromString(data, 'application/xml')
                return (extension === '.kml' ? kml(dom) : gpx(dom)) as GeoJSON
            }
            case '.geojson':
            case '.json':
                return JSON.parse(data)
            default:
                throw new Error(`Unsupported file format: ${extension}`)
        }
    }

    readFileData(files: FileList | null): void {
        if (!files) return

        const file = files[0]

        const reader = new FileReader()

        reader.onload = async () => {
            const data = reader.result
            if (typeof data !== 'string') return

            try {
                const geoJSONcontent = await this.parseAoiFileContent(file.name.toLowerCase(), data)

                const feature = MapGeoJsonUtils.extractFeature(geoJSONcontent)
                if (!feature?.geometry) {
                    throw new Error('No usable geometry found in file')
                }

                const featureName = feature.properties?.['name']
                if (typeof featureName === 'string' && featureName.trim()) {
                    this.areaLabelControl.setValue(featureName.trim())
                }

                this.bufferSourceFeature = feature

                if (feature.geometry.type.includes('Polygon')) {
                    await this.mapService.renderFeature(feature, file.name)
                } else {
                    // Apply the default buffer eagerly so the AOI is immediately submittable
                    this.bufferAoi(this.defaultBufferRadius)
                }
                // An uploaded AOI can be anywhere, so move the camera to it
                // (boundary clicks and drawings are already within the viewport)
                this.mapService.flyToExtent(bbox(feature) as Extent)
            } catch (reason) {
                console.error('File could not be loaded due to ', reason)
                this.toastr.error(this.translocoService.translate('pluginParameter.fileParseError'))
            }
        }

        reader.readAsText(file, 'UTF-8')
    }

    removeSelectedRegion(region: GeoJSONFeature): void {
        this.mapService.removeSelectedRegion(region)
        if (this.isDrawMode(this.currentSelectionMode)) {
            this.mapService.clearDrawnFeatures()
            this.mapService.stopDrawing()
            this.areaLabelControl.setValue('')
            this.mapService.startDrawing(this.currentSelectionMode)
        } else if (this.currentSelectionMode === ExternalInput.File) {
            this.resetFileInput()
            this.areaLabelControl.setValue('')
            this.bufferSourceFeature = undefined
        }
    }

    private isDrawMode(mode: GeometryInputMode): mode is DrawInput {
        return Object.values(DrawInput).includes(mode as DrawInput)
    }

    private setAreaNameRequired(required: boolean): void {
        if (required) {
            this.areaLabelControl.setValidators([Validators.required])
            this.areaLabelControl.markAsTouched()
        } else {
            this.areaLabelControl.clearValidators()
            this.areaLabelControl.markAsUntouched()
        }
        this.areaLabelControl.updateValueAndValidity()
    }

    private resetFileInput(): void {
        if (this.aoiFileInput) {
            this.aoiFileInput.nativeElement.value = ''
        }
    }

    private focusAreaLabel(): void {
        // Defer so the input is rendered by change detection before we focus it.
        setTimeout(() => this.areaLabelInput?.nativeElement.focus())
    }

    // Gate on the original geometry so the control stays visible after the geometry has been buffered into a polygon
    protected get requiresBuffer(): boolean {
        return !!this.bufferSourceFeature && !this.bufferSourceFeature.geometry.type.includes('Polygon')
    }

    protected get bufferSourceGeomType(): GeoJsonTypes | undefined {
        return this.bufferSourceFeature?.geometry.type
    }

    bufferAoi(bufferRadius: number) {
        if (!this.bufferSourceFeature) return
        const bufferedFeature = buffer(this.bufferSourceFeature, bufferRadius, { units: 'meters' })
        if (bufferedFeature) {
            this.mapService.renderFeature(bufferedFeature, 'buffered-aoi').catch(reason => {
                console.error('Feature could not be buffered because ' + reason)
            })
        }
    }
}
