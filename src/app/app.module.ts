import {NgModule} from '@angular/core'
import {BrowserModule} from '@angular/platform-browser'
import {FormsModule, ReactiveFormsModule} from '@angular/forms'
import {FormlyModule} from '@ngx-formly/core'
import {HttpClientModule} from '@angular/common/http'
import {MarkdownModule} from 'ngx-markdown'
import {NgChartsModule} from 'ng2-charts'
import {PluginsComponent} from './plugins/plugins.component'

import {AppRoutingModule} from './app.routing.module'
import {AppComponent} from './app.component'
import {NgOptimizedImage} from '@angular/common'
import {ObjectTypeComponent} from './types/object.type'
import {MultiSchemaTypeComponent} from './types/multischema.type'
import {ArrayTypeComponent} from './types/array.type'
import {NullTypeComponent} from './types/null.type'
import {ChartComponent} from './report/chart/chart.component'
import {ArtifactComponent} from './artifact/artifact.component'
import {FormlyMatDatepickerModule} from '@ngx-formly/material/datepicker'
import {FormlyMaterialModule} from '@ngx-formly/material'
import {MatDatepickerModule} from '@angular/material/datepicker'
import {BrowserAnimationsModule} from '@angular/platform-browser/animations'
import {MatInputModule} from '@angular/material/input'
import {MAT_DATE_FORMATS} from '@angular/material/core'
import {MAT_MOMENT_DATE_ADAPTER_OPTIONS, MatMomentDateModule} from '@angular/material-moment-adapter'
import {dateTypeValidator, intTypeValidator, numericTypeValidator} from './app.validators'
import {NotificationComponent} from './notification/notification.component'
import {RouteReuseStrategy} from '@angular/router'
import {CustomRouteReuseStrategy} from './app.ext'
import {FormlyFieldExpansionPanelComponent} from './types/formlyFieldExpansionPanel.type'
import {MatExpansionModule} from '@angular/material/expansion'
import {NgDompurifySanitizer} from '@tinkoff/ng-dompurify'
import {TuiRootModule, TuiDialogModule, TuiAlertModule, TUI_SANITIZER, TUI_ALERT_POSITION} from '@taiga-ui/core'


@NgModule({
    declarations: [
        AppComponent,
        ArrayTypeComponent,
        ObjectTypeComponent,
        MultiSchemaTypeComponent,
        NullTypeComponent,
        ChartComponent,
        FormlyFieldExpansionPanelComponent
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
        MatExpansionModule,
        PluginsComponent,
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
                {name: 'multischema', component: MultiSchemaTypeComponent},
                {name: 'expander', component: FormlyFieldExpansionPanelComponent, wrappers: []}
            ]
        }),
        FormlyMatDatepickerModule,
        MarkdownModule.forRoot(),
        NgChartsModule,
        ArtifactComponent,
        NotificationComponent,
        TuiRootModule,
        TuiDialogModule,
        TuiAlertModule
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
        },
        {
            provide: RouteReuseStrategy,
            useClass: CustomRouteReuseStrategy
        },
        {
            provide: TUI_SANITIZER,
            useClass: NgDompurifySanitizer
        },
        {
            provide: TUI_ALERT_POSITION,
            useValue: 'auto 3rem 3rem auto'
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}