import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterModule } from '@angular/router'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ArtifactComponent } from './artifact/artifact.component'
import { ComputationComponent } from './computation/computation.component'
import { DashboardComponent } from './dashboard.component'
import { MapService } from './map/map.service'
import { PluginCatalogComponent } from './plugin-catalog/plugin-catalog.component'

describe('DashboardComponent', () => {
    let component: DashboardComponent
    let fixture: ComponentFixture<DashboardComponent>
    let mockMapService: Partial<MapService>

    beforeEach(() => {
        mockMapService = {
            initMap: jest.fn(),
            highlightAoI: jest.fn(),
            removeFocusedLayer: jest.fn()
        }

        TestBed.configureTestingModule({
            imports: [
                ComputationComponent,
                DashboardComponent,
                HttpClientModule,
                ArtifactComponent,
                PluginCatalogComponent,
                RouterModule.forRoot([])
            ],
            providers: [
                { provide: MapService, useValue: mockMapService },
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
        fixture = TestBed.createComponent(DashboardComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
