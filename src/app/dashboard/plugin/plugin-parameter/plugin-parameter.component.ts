import { CommonModule, NgIf } from '@angular/common'
import {
    ChangeDetectorRef,
    Component,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
    ViewEncapsulation
} from '@angular/core'
import { AbstractControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { MatTooltip } from '@angular/material/tooltip'
import { AppwriteService } from '@app/auth/appwrite.service'
import { MapService } from '@app/dashboard/map/map.service'
import { ComputeRequest, Plugin } from '@app/dashboard/plugin/plugin.interface'
import { PluginService } from '@app/dashboard/plugin/plugin.service'
import { Source } from '@app/types/sources/sources.type'
import { TippyDirective } from '@ngneat/helipopper'
import { FormlyFieldConfig, FormlyFormOptions, FormlyModule } from '@ngx-formly/core'
import { FormlyJsonschema } from '@ngx-formly/core/json-schema'
import { Models } from 'appwrite'
import { JSONSchema7 } from 'json-schema'
import {
    CircleAlert,
    CirclePlay,
    CircleX,
    LucideAngularModule,
    MapPinPlusInside,
    TriangleAlert,
    UserCheck
} from 'lucide-angular'
import moment from 'moment/moment'
import { MarkdownModule } from 'ngx-markdown'
import { NgScrollbarModule } from 'ngx-scrollbar'
import Feature from 'ol/Feature'
import { Subscription, fromEventPattern } from 'rxjs'
import { FormlyModel } from './plugin-parameter.interface'

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
        CommonModule,
        MatTooltip,
        NgScrollbarModule,
        TippyDirective,
        MarkdownModule
    ],
    standalone: true,
    encapsulation: ViewEncapsulation.None
})
export class PluginParameterComponent implements OnInit, OnChanges, OnDestroy {
    @Input() schema!: JSONSchema7
    @Input() plugin!: Plugin

    @ViewChild('pluginMethodologyDialog') pluginMethodologyDialog!: TemplateRef<Plugin>

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

    areaSelected = false
    highlightedFeaturesSubscription: Subscription | undefined

    constructor(
        private pluginService: PluginService,
        private snackBar: MatSnackBar,
        public mapService: MapService,
        private cdr: ChangeDetectorRef,
        private formlyJsonschema: FormlyJsonschema,
        private appwriteService: AppwriteService,
        private dialog: MatDialog
    ) {
        const highlightedFeaturesObservable = fromEventPattern(handler =>
            this.mapService.selectedFeatures.on('change:length', handler)
        )

        this.highlightedFeaturesSubscription = highlightedFeaturesObservable.subscribe(() => {
            this.toggleFormState()
        })

        this.appwriteService._user.subscribe(user => {
            this.user = user
        })
    }

    ngOnInit(): void {
        this.form.disable()
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
    }

    deselectRegion(region: Feature): void {
        this.mapService.selectedFeatures.remove(region)

        if (this.mapService.selectedFeatures.getLength() === 0) {
            this.toggleFormState()
        }
    }

    resetForm(): void {
        this.form.reset()
        this.mapService.selectedFeatures.clear()
        this.snackBar.open('All form values have been reset to their defaults.', 'Dismiss', {
            duration: 4000,
            verticalPosition: 'bottom',
            horizontalPosition: 'center',
            panelClass: ['info-snackbar']
        })
    }

    toggleFormState(): void {
        if (this.mapService.selectedFeatures.getLength() > 0) {
            this.form.enable()
            this.areaSelected = true
        } else {
            this.form.disable()
            this.areaSelected = false
        }
        this.cdr.detectChanges()
    }

    parseFieldsFromSchema(schema: JSONSchema7): FormlyFieldConfig[] {
        const options = { map: this.custom_field_transformer }
        return [this.formlyJsonschema.toFieldConfig(schema, options)]
    }

    private custom_field_transformer(field: FormlyFieldConfig, schema: JSONSchema7): FormlyFieldConfig {
        function separateOptionalParameters(field: FormlyFieldConfig, schema: JSONSchema7): FormlyFieldConfig {
            if (!field.fieldGroup) return field

            const splittedFieldGroup: FormlyFieldConfig[] = []
            const optionalSubgroup: FormlyFieldConfig[] = []

            field.fieldGroup.forEach((parsedField: FormlyFieldConfig) => {
                if (schema.required?.includes(String(parsedField.key))) {
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
                                label: 'Optional Attributes',
                                description: 'Edit additional parameters.'
                            },
                            fieldGroup: optionalSubgroup
                        }
                    ]
                })
            }
            field.fieldGroup = splittedFieldGroup

            return field
        }

        if (schema.examples && Array.isArray(schema.examples)) {
            field.props = field.props || {}
            field.props.placeholder = String(schema.examples[0])
        }

        if (schema.format == 'date') {
            field.type = 'datepicker'
            field.parsers = [v => (moment.isMoment(v) ? v.format('YYYY-MM-DD') : v)]
            field.validators = { date: (control: AbstractControl) => moment(control.value, true).isValid() }
        }

        field = separateOptionalParameters(field, schema)

        return field
    }

    private requestCompute(model: FormlyModel) {
        const aoi = this.mapService.getSelectedRegion()
        const aoiName = aoi.properties?.name

        if (!aoi) {
            this.snackBar.open('Please select an area on the map first.', 'Dismiss', {
                verticalPosition: 'bottom',
                horizontalPosition: 'center',
                panelClass: ['error-snackbar']
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

        this.pluginService.computePlugin(this.plugin.plugin_id, computeRequest).subscribe({
            next: data => {
                this.pluginService.storeNewComputes(data.correlation_uuid, this.plugin.plugin_id, aoiName)
                this.pluginService.triggerSyncTasks()
                this.pluginService.setComputeState('inactive')

                this.snackBar.open('Compute request sent, results will be displayed soon.', 'Dismiss', {
                    duration: 7000,
                    verticalPosition: 'bottom',
                    horizontalPosition: 'center',
                    panelClass: ['success-snackbar']
                })
            },
            error: () => {
                this.snackBar.open('Error while computing plugin. Please try again.', 'Dismiss', {
                    verticalPosition: 'bottom',
                    horizontalPosition: 'center',
                    panelClass: ['error-snackbar']
                })
            }
        })
    }

    processSourceText(source: Source) {
        const commonFields = [source.author, source.year]

        switch (source.ENTRYTYPE) {
            case 'article':
                return [...commonFields, source.journal, source.volume, source.pages].filter(Boolean).join(', ')
            case 'inbook':
            case 'inproceedings':
                return [...commonFields, source.pages].filter(Boolean).join(', ')
            case 'misc':
                return [...commonFields].filter(Boolean).join(', ')
            default:
                return ''
        }
    }

    openDialog(plugin: Plugin): void {
        this.dialog.open(this.pluginMethodologyDialog, {
            data: plugin,
            autoFocus: false
        })
    }

    closeDialog(): void {
        this.dialog.closeAll()
    }
}
