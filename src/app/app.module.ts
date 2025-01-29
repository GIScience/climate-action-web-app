import { NgOptimizedImage } from '@angular/common'
import { HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MatMomentDateModule } from '@angular/material-moment-adapter'
import { MAT_DATE_FORMATS } from '@angular/material/core'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatDialogModule } from '@angular/material/dialog'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatInputModule } from '@angular/material/input'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { RouteReuseStrategy } from '@angular/router'
import { popperVariation, provideTippyConfig, provideTippyLoader } from '@ngneat/helipopper/config'
import { FormlyModule } from '@ngx-formly/core'
import { FormlyMaterialModule } from '@ngx-formly/material'
import { FormlyMatDatepickerModule } from '@ngx-formly/material/datepicker'
import { CircleUserRound, LucideAngularModule } from 'lucide-angular'
import { NgChartsModule } from 'ng2-charts'
import { MarkdownModule } from 'ngx-markdown'
import { AppComponent } from './app.component'
import { CustomRouteReuseStrategy } from './app.ext'
import { AppRoutingModule } from './app.routing.module'
import { dateTypeValidator, intTypeValidator, numericTypeValidator } from './app.validators'
import { ChartComponent } from './dashboard/artifact/chart/chart.component'
import { ComputationComponent } from './dashboard/computation/computation.component'
import { ComputationsIndexComponent } from './dashboard/computations-index/computations-index.component'
import { MapService } from './dashboard/map/map.service'
import { PluginCatalogComponent } from './dashboard/plugin-catalog/plugin-catalog.component'
import { ArrayTypeComponent } from './types/array/array.type'
import { FormlyFieldExpansionPanelComponent } from './types/expansion-panel/formlyFieldExpansionPanel.type'
import { MultiSchemaTypeComponent } from './types/multischema/multischema.type'
import { NullTypeComponent } from './types/null/null.type'
import { ObjectTypeComponent } from './types/object/object.type'
import { tooltipVariation } from './utils/tooltip-variations'

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
        MatSnackBarModule,
        PluginCatalogComponent,
        MatDialogModule,
        FormlyModule.forRoot({
            validators: [
                { name: 'intType', validation: intTypeValidator },
                { name: 'numType', validation: numericTypeValidator },
                { name: 'dateType', validation: dateTypeValidator }
            ],
            validationMessages: [{ name: 'required', message: 'This field is required' }],
            types: [
                { name: 'null', component: NullTypeComponent, wrappers: ['form-field'] },
                { name: 'array', component: ArrayTypeComponent },
                { name: 'object', component: ObjectTypeComponent },
                { name: 'multischema', component: MultiSchemaTypeComponent },
                { name: 'expander', component: FormlyFieldExpansionPanelComponent, wrappers: [] }
            ]
        }),
        FormlyMatDatepickerModule,
        MarkdownModule.forRoot(),
        NgChartsModule,
        ComputationsIndexComponent,
        ComputationComponent,
        LucideAngularModule.pick({ CircleUserRound })
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
            provide: MapService
        },
        provideTippyLoader(() => import('tippy.js')),
        provideTippyConfig({
            defaultVariation: 'tooltip',
            variations: {
                tooltip: tooltipVariation,
                popper: popperVariation
            }
        })
    ],
    bootstrap: [AppComponent]
})
export class AppModule {}
