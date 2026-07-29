import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { importProvidersFrom, provideZoneChangeDetection } from '@angular/core'
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser'
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations'
import { RouteReuseStrategy, Routes, provideRouter } from '@angular/router'
import { AppComponent } from '@app/app.component'
import { CustomRouteReuseStrategy } from '@app/app.ext'
import { AuthInterceptor } from '@app/auth/auth.interceptor'
import { DashboardComponent } from '@app/dashboard/dashboard.component'
import { MapService } from '@app/dashboard/map/map.service'
import { PageNotFoundComponent } from '@app/page-not-found/page-not-found.component'
import { SUPPORTED_LANGUAGES, SupportedLanguage, isValidLanguage } from '@app/types/language.types'
import { tooltipVariation } from '@app/utils/tooltip-variations.utils'
import { provideTransloco } from '@jsverse/transloco'
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat'
import { popperVariation, provideTippyConfig, provideTippyLoader } from '@ngneat/helipopper/config'
import { CircleUserRound, LucideAngularModule } from 'lucide-angular'
import { provideCharts, withDefaultRegisterables } from 'ng2-charts'
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
                loadComponent: () => import('@app/dashboard/landing/landing.component').then(m => m.LandingComponent)
            },
            {
                path: 'plugin/:name',
                loadComponent: () => import('@app/dashboard/plugin/plugin.component').then(m => m.PluginComponent)
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
        provideZoneChangeDetection(),
        provideRouter(routes),
        importProvidersFrom(BrowserModule, BrowserAnimationsModule, LucideAngularModule.pick({ CircleUserRound })),
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
        provideCharts(withDefaultRegisterables()),
        provideToastr({
            positionClass: 'toast-bottom-center',
            extendedTimeOut: 0,
            preventDuplicates: true,
            includeTitleDuplicates: true,
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
