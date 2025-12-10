import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { importProvidersFrom } from '@angular/core'
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter'
import { MAT_DATE_LOCALE } from '@angular/material/core'
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser'
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations'
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
import { SUPPORTED_LANGUAGES, SupportedLanguage, isValidLanguage } from '@app/types/language.types'
import { ObjectTypeComponent } from '@app/types/object/object.type'
import { tooltipVariation } from '@app/utils/tooltip-variations.utils'
import { provideTransloco } from '@jsverse/transloco'
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat'
import { popperVariation, provideTippyConfig, provideTippyLoader } from '@ngneat/helipopper/config'
import { FormlyModule } from '@ngx-formly/core'
import { FormlyMaterialModule } from '@ngx-formly/material'
import { FormlyMatDatepickerModule } from '@ngx-formly/material/datepicker'
import { enUS } from 'date-fns/locale'
import { CircleUserRound, LucideAngularModule } from 'lucide-angular'
import { MarkdownModule } from 'ngx-markdown'
import { provideToastr } from 'ngx-toastr'
import { environment } from './environments/environment'
import { TranslocoHttpLoader } from './transloco-loader'

function getBrowserLanguage(): SupportedLanguage {
    const storageKey = 'language_pref'
    const hasWindow = typeof window !== 'undefined'
    const storage = hasWindow
        ? (() => {
              try {
                  return window.localStorage
              } catch (error) {
                  console.warn('localStorage is not accessible in this environment.', error)
                  return null
              }
          })()
        : null

    if (storage) {
        const savedLang = storage.getItem(storageKey)
        if (savedLang) {
            try {
                const parsedLang: unknown = JSON.parse(savedLang)
                if (typeof parsedLang === 'string' && isValidLanguage(parsedLang)) {
                    return parsedLang
                }
            } catch (error) {
                console.warn('Failed to parse language preference from localStorage:', error)
            }
        }
    }

    const browserLang = hasWindow ? window.navigator?.language || window.navigator?.languages?.[0] : undefined
    const langCode = browserLang?.toLowerCase().split('-')[0] ?? SupportedLanguage.EN

    const detectedLang: SupportedLanguage = isValidLanguage(langCode)
        ? (langCode as SupportedLanguage)
        : SupportedLanguage.EN

    return detectedLang
}

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
    // Legacy redirect: /webapp/* → /dashboard (old URL structure)
    {
        path: 'webapp',
        children: [{ path: '**', redirectTo: '/dashboard' }]
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
            FormlyMaterialModule,
            FormlyMatDatepickerModule,
            MarkdownModule.forRoot(),
            LucideAngularModule.pick({ CircleUserRound })
        ),
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
        { provide: MAT_DATE_LOCALE, useValue: enUS },
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
        provideAnimations(),
        provideToastr({
            positionClass: 'toast-bottom-center',
            extendedTimeOut: 0,
            preventDuplicates: true,
            maxOpened: 10,
            easeTime: 100,
            autoDismiss: true,
            progressBar: true,
            closeButton: true
        }),
        provideHttpClient(withInterceptorsFromDi()),
        provideTransloco({
            config: {
                availableLangs: Array.from(SUPPORTED_LANGUAGES),
                defaultLang: getBrowserLanguage(),
                fallbackLang: SupportedLanguage.EN,
                reRenderOnLangChange: true,
                prodMode: environment.environmentType === 'production'
            },
            loader: TranslocoHttpLoader
        }),
        provideTranslocoMessageformat({
            locales: Array.from(SUPPORTED_LANGUAGES)
        })
    ]
}).catch(err => console.error(err))
