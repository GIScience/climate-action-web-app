import { NgOptimizedImage } from '@angular/common'
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatMomentDateModule, provideMomentDateAdapter } from '@angular/material-moment-adapter'
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
import { AccountComponent } from './account/account.component'
import { AppComponent } from './app.component'
import { CustomRouteReuseStrategy } from './app.ext'
import { AppRoutingModule } from './app.routing.module'
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
} from './app.validation-messages'
import { AuthInterceptor } from './auth/auth.interceptor'
import { ChartComponent } from './dashboard/artifact/chart/chart.component'
import { ComputationComponent } from './dashboard/computation/computation.component'
import { ComputationsIndexComponent } from './dashboard/computations-index/computations-index.component'
import { MapService } from './dashboard/map/map.service'
import { PluginCatalogComponent } from './dashboard/plugin-catalog/plugin-catalog.component'
import { OptionalAttributesTypeComponent } from './types/dialog/optional-attributes'
import { ObjectTypeComponent } from './types/object/object.type'
import { tooltipVariation } from './utils/tooltip-variations'

@NgModule({
    declarations: [AppComponent, ObjectTypeComponent, ChartComponent],
    imports: [
        MatInputModule,
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        AppRoutingModule,
        HttpClientModule,
        NgOptimizedImage,
        ReactiveFormsModule,
        FormlyMaterialModule,
        MatMomentDateModule,
        MatExpansionModule,
        MatSnackBarModule,
        PluginCatalogComponent,
        MatDialogModule,
        AccountComponent,
        FormlyModule.forRoot({
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
        }),
        FormlyMatDatepickerModule,
        MarkdownModule.forRoot(),
        NgChartsModule,
        ComputationsIndexComponent,
        ComputationComponent,
        LucideAngularModule.pick({ CircleUserRound })
    ],
    providers: [
        provideMomentDateAdapter(
            {
                parse: {
                    dateInput: ['YYYY-MM-DD', 'll', 'LL', 'l', 'll']
                },
                display: {
                    dateInput: 'LL',
                    monthYearLabel: 'MMM YYYY',
                    dateA11yLabel: 'LL',
                    monthYearA11yLabel: 'MMMM YYYY'
                }
            },
            {
                useUtc: true,
                strict: true
            }
        ),
        {
            provide: RouteReuseStrategy,
            useClass: CustomRouteReuseStrategy
        },
        {
            provide: MapService
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
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
