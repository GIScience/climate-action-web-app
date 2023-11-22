import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {FormlyModule} from '@ngx-formly/core';
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
import {NotificationComponent} from './runs/notification.component';

@NgModule({
    declarations: [
        AppComponent,
        PageNotFoundComponent,
        ToastComponent,
        AboutComponent,
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
        NotificationComponent,
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
                {name: 'required', message: 'This field is required'}
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
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}