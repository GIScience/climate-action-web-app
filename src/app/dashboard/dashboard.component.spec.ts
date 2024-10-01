import {ComponentFixture, TestBed} from '@angular/core/testing'
import {RouterModule} from '@angular/router'
import {DashboardComponent} from './dashboard.component'
import {ArtifactComponent} from './artifact/artifact.component'
import {HttpClientModule} from '@angular/common/http'
import {ReportComponent} from './report/report.component'
import {PluginCatalogComponent} from './plugin-catalog/plugin-catalog.component'

describe('DashboardComponent', () => {
    let component: DashboardComponent
    let fixture: ComponentFixture<DashboardComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                ArtifactComponent,
                DashboardComponent,
                HttpClientModule,
                ReportComponent,
                PluginCatalogComponent,
                RouterModule.forRoot([])
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
