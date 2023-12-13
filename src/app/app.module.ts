import {NgModule} from '@angular/core'
import {BrowserModule} from '@angular/platform-browser'
import {AbstractControl, FormsModule, ReactiveFormsModule, ValidationErrors} from '@angular/forms'
import {FormlyFieldConfig, FormlyModule} from '@ngx-formly/core'
import {HttpClientModule} from '@angular/common/http'
import {MarkdownModule} from 'ngx-markdown'
import {NgChartsModule} from 'ng2-charts'
import {MatTreeModule} from '@angular/material/tree'

import {AppRoutingModule} from './app-routing.module'
import {AppComponent} from './app.component'
import {ToastComponent} from './toast/toast.component'
import {AboutComponent} from './about/about.component'
import {NgOptimizedImage} from '@angular/common'
import {ObjectTypeComponent} from './types/object.type'
import {MultiSchemaTypeComponent} from './types/multischema.type'
import {ArrayTypeComponent} from './types/array.type'
import {NullTypeComponent} from './types/null.type'
import {ChartComponent} from './report/chart/chart.component'
import {NotificationComponent} from './notification/notification.component'
import {ArtifactComponent} from './artifact/artifact.component'
import {FormlyMatDatepickerModule} from '@ngx-formly/material/datepicker'
import {FormlyMaterialModule} from '@ngx-formly/material'
import {MatDatepickerModule} from '@angular/material/datepicker'
import {BrowserAnimationsModule} from '@angular/platform-browser/animations'
import {MatInputModule} from '@angular/material/input'
import {MAT_DATE_FORMATS} from '@angular/material/core'
import {MAT_MOMENT_DATE_ADAPTER_OPTIONS, MatMomentDateModule} from '@angular/material-moment-adapter'
import moment from 'moment/moment'
import {ValidatorOptions} from './plugin/plugin-parameter/plugin-parameter.interface'

export function intTypeValidator(control: AbstractControl,
                                 _: FormlyFieldConfig,
                                 options: ValidatorOptions = {}): ValidationErrors {
    if (!control.value) {
        return {}
    } else if (!/^-?[0-9]*$/.test(control.value) || isNaN(parseInt(control.value))) {
        return {intType: {message: 'Not an integer!'}}
    } else if (options.min != undefined && parseInt(control.value) < options.min) {
        return {intType: {message: `Value must be bigger than ${options.min}`}}
    } else if (options.max != undefined && parseInt(control.value) > options.max) {
        return {intType: {message: `Value must be smaller than ${options.max}`}}
    }
    return {}
}

export function numericTypeValidator(control: AbstractControl,
                                     _: FormlyFieldConfig,
                                     options: ValidatorOptions = {}): ValidationErrors {
    if (!control.value) {
        return {}
    } else if (!/^-?[0-9]*(\.[0-9]*)?$/.test(control.value) || isNaN(parseFloat(control.value))) {
        return {numType: {message: 'Not a number!'}}
    } else if (options.min != undefined && parseFloat(control.value) < options.min) {
        return {numType: {message: `Value must be bigger than ${options.min}`}}
    } else if (options.max != undefined && parseFloat(control.value) > options.max) {
        return {numType: {message: `Value must be smaller than ${options.max}`}}
    }
    return {}
}

export function dateTypeValidator(control: AbstractControl,
                                  _: FormlyFieldConfig,
                                  options: ValidatorOptions = {}): ValidationErrors {
    if (!control.value) {
        return {}
    } else if (!moment(control.value, moment.ISO_8601, true).isValid()) {
        return {numType: {message: 'Not a date!'}}
    } else if (moment(control.value) < moment(options.min)) {
        return {numType: {message: `Value must be bigger than ${options.min}`}}
    } else if (moment(control.value) > moment(options.max)) {
        return {numType: {message: `Value must be smaller than ${options.max}`}}
    }
    return {}
}

@NgModule({
    declarations: [
        AppComponent,
        ToastComponent,
        AboutComponent,
        ArrayTypeComponent,
        ObjectTypeComponent,
        MultiSchemaTypeComponent,
        NullTypeComponent,
        ChartComponent,
        NotificationComponent
    ],
    imports: [
        MatInputModule,
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        AppRoutingModule,
        HttpClientModule,
        NgOptimizedImage,
        ReactiveFormsModule,
        MatDatepickerModule,
        FormlyMaterialModule,
        MatMomentDateModule,
        FormlyModule.forRoot({
            validators: [
                {name: 'intType', validation: intTypeValidator},
                {name: 'numType', validation: numericTypeValidator},
                {name: 'dateType', validation: dateTypeValidator}
            ],
            validationMessages: [
                {name: 'required', message: 'This field is required'}
            ],
            types: [
                {name: 'null', component: NullTypeComponent, wrappers: ['form-field']},
                {name: 'array', component: ArrayTypeComponent},
                {name: 'object', component: ObjectTypeComponent},
                {name: 'multischema', component: MultiSchemaTypeComponent}
            ]
        }),
        FormlyMatDatepickerModule,
        MarkdownModule.forRoot(),
        MatTreeModule,
        NgChartsModule,
        ArtifactComponent
    ],
    providers: [
        {
            provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS,
            useValue: {
                useUtc: true,
                strict: true
            }
        },
        {
            provide: MAT_DATE_FORMATS,
            useValue: {
                parse: {
                    dateInput: 'YYYY-MM-DD'
                },
                display: {
                    dateInput: 'YYYY-MM-DD',
                    monthYearLabel: 'MMM YYYY',
                    dateA11yLabel: 'LL',
                    monthYearA11yLabel: 'LL'
                }
            }
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}