import {ComponentFixture, TestBed} from '@angular/core/testing'
import {RouterModule} from '@angular/router'
import {DashboardComponent} from './dashboard.component'
import {ComputationComponent} from './computation/computation.component'
import {HttpClientModule} from '@angular/common/http'
import {ArtifactComponent} from './artifact/artifact.component'
import {PluginCatalogComponent} from './plugin-catalog/plugin-catalog.component'
import {provideTippyLoader, provideTippyConfig, tooltipVariation, popperVariation} from '@ngneat/helipopper/config'

describe('DashboardComponent', () => {
    let component: DashboardComponent
    let fixture: ComponentFixture<DashboardComponent>

    beforeEach(() => {
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
