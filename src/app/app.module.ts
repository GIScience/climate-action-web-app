import {APP_INITIALIZER, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {FormlyFieldConfig, FormlyModule} from '@ngx-formly/core';
import {FormlyBootstrapModule} from '@ngx-formly/bootstrap';
import {HttpClientModule} from '@angular/common/http';
import {MarkdownModule} from "ngx-markdown";
import {NgChartsModule} from 'ng2-charts';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {PageNotFoundComponent} from './page-not-found/page-not-found.component';
import {ToastComponent} from './toast/toast.component';
import {AboutComponent} from './about/about.component';
import {NgOptimizedImage} from '@angular/common';
import {PluginsComponent} from './plugins/plugins.component';
import {ArtifactsComponent} from './artifacts/artifacts.component';
import {ReportComponent} from './report/report.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {PluginComponent} from './plugin/plugin.component';
import {PluginParameterComponent} from './plugin/plugin-parameter/plugin-parameter.component';
import {ObjectTypeComponent} from "./types/object.type";
import {MultiSchemaTypeComponent} from "./types/multischema.type";
import {ArrayTypeComponent} from "./types/array.type";
import {NullTypeComponent} from "./types/null.type";
import {ChartComponent} from './report/chart/chart.component';
import {RunsComponent} from './runs/runs.component';

// import { HelpComponent } from './help/help.component';

export function minItemsValidationMessage(error: any, field: FormlyFieldConfig) {
    // @ts-ignore
    return `should NOT have fewer than ${field.props.minItems} items`;
}

export function maxItemsValidationMessage(error: any, field: FormlyFieldConfig) {
    // @ts-ignore
    return `should NOT have more than ${field.props.maxItems} items`;
}

export function minLengthValidationMessage(error: any, field: FormlyFieldConfig) {
    // @ts-ignore
    return `should NOT be shorter than ${field.props.minLength} characters`;
}

export function maxLengthValidationMessage(error: any, field: FormlyFieldConfig) {
    // @ts-ignore
    return `should NOT be longer than ${field.props.maxLength} characters`;
}

export function minValidationMessage(error: any, field: FormlyFieldConfig) {
    // @ts-ignore
    return `should be >= ${field.props.min}`;
}

export function maxValidationMessage(error: any, field: FormlyFieldConfig) {
    // @ts-ignore
    return `should be <= ${field.props.max}`;
}

export function multipleOfValidationMessage(error: any, field: FormlyFieldConfig) {
    // @ts-ignore
    return `should be multiple of ${field.props.step}`;
}

export function exclusiveMinimumValidationMessage(error: any, field: FormlyFieldConfig) {
    // @ts-ignore
    return `should be > ${field.props.step}`;
}

export function exclusiveMaximumValidationMessage(error: any, field: FormlyFieldConfig) {
    // @ts-ignore
    return `should be < ${field.props.step}`;
}

export function constValidationMessage(error: any, field: FormlyFieldConfig) {
    // @ts-ignore
    return `should be equal to constant "${field.props.const}"`;
}

export function typeValidationMessage({schemaType}: any) {
    return `should be "${schemaType[0]}".`;
}

@NgModule({
    declarations: [
        AppComponent,
        PageNotFoundComponent,
        ToastComponent,
        AboutComponent,
        // HelpComponent,
        PluginsComponent,
        ArtifactsComponent,
        ReportComponent,
        DashboardComponent,
        PluginComponent,
        PluginParameterComponent,
        ArrayTypeComponent,
        ObjectTypeComponent,
        MultiSchemaTypeComponent,
        NullTypeComponent,
        ChartComponent,
        RunsComponent,
    ],
    imports: [
        BrowserModule,
        FormsModule,
        AppRoutingModule,
        HttpClientModule,
        NgOptimizedImage,
        ReactiveFormsModule,
        FormlyModule.forRoot({
            validationMessages: [
                {name: 'required', message: 'This field is required'},
                //     {name: 'type', message: typeValidationMessage},
                //     {name: 'minLength', message: minLengthValidationMessage},
                //     {name: 'maxLength', message: maxLengthValidationMessage},
                //     {name: 'min', message: minValidationMessage},
                //     {name: 'max', message: maxValidationMessage},
                //     {name: 'multipleOf', message: multipleOfValidationMessage},
                //     {name: 'exclusiveMinimum', message: exclusiveMinimumValidationMessage},
                //     {name: 'exclusiveMaximum', message: exclusiveMaximumValidationMessage},
                //     {name: 'minItems', message: minItemsValidationMessage},
                //     {name: 'maxItems', message: maxItemsValidationMessage},
                //     {name: 'uniqueItems', message: 'should NOT have duplicate items'},
                //     {name: 'const', message: constValidationMessage},
                //     {name: 'enum', message: `must be equal to one of the allowed values`},
            ],
            types: [
                {name: 'null', component: NullTypeComponent, wrappers: ['form-field']},
                {name: 'array', component: ArrayTypeComponent},
                {name: 'object', component: ObjectTypeComponent},
                {name: 'multischema', component: MultiSchemaTypeComponent},
            ],
        }),
        FormlyBootstrapModule,
        MarkdownModule.forRoot(),
        NgChartsModule,
    ],
    providers: [
        // { provide: APP_INITIALIZER, useFactory: metadataFactory, deps: [DataService], multi: true }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}

// export function metadataFactory(provider: DataService) {
//   return () => provider.requestMetadata();
// }
