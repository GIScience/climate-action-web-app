import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { importProvidersFrom } from '@angular/core'
import { provideMomentDateAdapter } from '@angular/material-moment-adapter'
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { RouteReuseStrategy, Routes, provideRouter } from '@angular/router'
import { AppComponent } from '@app/app.component'
import { CustomRouteReuseStrategy } from '@app/app.ext'
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
import { AuthInterceptor } from '@app/auth/auth.interceptor'
import { DashboardComponent } from '@app/dashboard/dashboard.component'
import { LandingComponent } from '@app/dashboard/landing/landing.component'
import { MapService } from '@app/dashboard/map/map.service'
import { PluginComponent } from '@app/dashboard/plugin/plugin.component'
import { PageNotFoundComponent } from '@app/page-not-found/page-not-found.component'
import { OptionalAttributesTypeComponent } from '@app/types/dialog/optional-attributes'
import { ObjectTypeComponent } from '@app/types/object/object.type'
import { tooltipVariation } from '@app/utils/tooltip-variations'
import { popperVariation, provideTippyConfig, provideTippyLoader } from '@ngneat/helipopper/config'
import { FormlyModule } from '@ngx-formly/core'
import { CircleUserRound, LucideAngularModule } from 'lucide-angular'
import { MarkdownModule } from 'ngx-markdown'

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full' as const,
        redirectTo: 'dashboard'
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        children: [
            {
                path: '',
                component: LandingComponent
            },
            {
                path: 'plugin/:name',
                component: PluginComponent
            }
        ]
    },
    {
        path: '**',
        component: PageNotFoundComponent
    }
]

bootstrapApplication(AppComponent, {
    providers: [
        provideRouter(routes),
        importProvidersFrom(
            BrowserModule,
            BrowserAnimationsModule,
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
            MarkdownModule.forRoot(),
            LucideAngularModule.pick({ CircleUserRound })
        ),
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
        }),
        provideHttpClient(withInterceptorsFromDi())
    ]
}).catch(err => console.error(err))
