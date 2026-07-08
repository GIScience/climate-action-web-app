import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { environment } from '@environments/environment'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { PluginCatalogComponent } from './plugin-catalog.component'

describe('PluginCatalogComponent', () => {
    let component: PluginCatalogComponent
    let fixture: ComponentFixture<PluginCatalogComponent>
    let httpMock: HttpTestingController

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                PluginCatalogComponent,
                TranslocoTestingModule.forRoot({ langs: { en: {}, de: {} }, translocoConfig: { defaultLang: 'en' } })
            ],
            providers: [
                provideTippyLoader(() => import('tippy.js')),
                provideTippyConfig({
                    defaultVariation: 'tooltip',
                    variations: {
                        tooltip: tooltipVariation,
                        popper: popperVariation
                    }
                })
            ]
        })
        httpMock = TestBed.inject(HttpTestingController)
        fixture = TestBed.createComponent(PluginCatalogComponent)
        component = fixture.componentInstance
        fixture.detectChanges()

        const req = httpMock.expectOne(
            request =>
                request.url === `${environment.climateActionApiUrl}/plugin` && request.params.get('lang') === 'en'
        )
        req.flush([
            {
                plugin_id: 'demo-plugin',
                name: 'Demo Plugin',
                library_version: '1.0.0',
                version: '1.0.0',
                teaser: 'Demo teaser'
            }
        ])
    })

    afterEach(() => {
        httpMock.verify()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
