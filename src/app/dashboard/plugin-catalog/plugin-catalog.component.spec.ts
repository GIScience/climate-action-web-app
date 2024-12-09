import {ComponentFixture, TestBed} from '@angular/core/testing'
import {PluginCatalogComponent} from './plugin-catalog.component'
import {HttpClientModule} from '@angular/common/http'
import {provideTippyLoader, provideTippyConfig, tooltipVariation, popperVariation} from '@ngneat/helipopper/config'

describe('PluginCatalogComponent', () => {
    let component: PluginCatalogComponent
    let fixture: ComponentFixture<PluginCatalogComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                PluginCatalogComponent
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
        fixture = TestBed.createComponent(PluginCatalogComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
