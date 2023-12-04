import {NgModule} from '@angular/core'
import {BrowserModule} from '@angular/platform-browser'
import {FormsModule, ReactiveFormsModule} from '@angular/forms'
import {FormlyModule} from '@ngx-formly/core'
import {FormlyBootstrapModule} from '@ngx-formly/bootstrap'
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
                {name: 'multischema', component: MultiSchemaTypeComponent}
            ]
        }),
        FormlyBootstrapModule,
        MarkdownModule.forRoot(),
        MatTreeModule,
        NgChartsModule,
        ArtifactComponent
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}