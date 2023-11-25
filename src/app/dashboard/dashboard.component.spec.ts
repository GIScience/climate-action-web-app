import {ComponentFixture, TestBed} from '@angular/core/testing'

import {DashboardComponent} from './dashboard.component'
import {ArtifactsComponent} from "../artifacts/artifacts.component"
import {HttpClientModule} from "@angular/common/http"
import {ReportComponent} from "../report/report.component"
import {PluginsComponent} from "../plugins/plugins.component"

describe('DashboardComponent', () => {
    let component: DashboardComponent
    let fixture: ComponentFixture<DashboardComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                ArtifactsComponent,
                DashboardComponent,
                HttpClientModule,
                ReportComponent,
                PluginsComponent
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
