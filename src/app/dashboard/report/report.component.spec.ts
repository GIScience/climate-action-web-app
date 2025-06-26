import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ToastrService } from 'ngx-toastr'
import { MockToastrService } from '../../../../jest.mocks'
import { ReportComponent } from './report.component'

describe('ReportComponent', () => {
    let component: ReportComponent
    let fixture: ComponentFixture<ReportComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ReportComponent, HttpClientModule],
            providers: [{ provide: ToastrService, useClass: MockToastrService }]
        }).compileComponents()

        fixture = TestBed.createComponent(ReportComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
