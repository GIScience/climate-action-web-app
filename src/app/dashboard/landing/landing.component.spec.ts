import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterModule } from '@angular/router'
import { ToastrService } from 'ngx-toastr'
import { MockToastrService } from '../../../../jest.mocks'
import { LandingComponent } from './landing.component'

describe('LandingComponent', () => {
    let component: LandingComponent
    let fixture: ComponentFixture<LandingComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, LandingComponent, RouterModule.forRoot([])],
            providers: [{ provide: ToastrService, useClass: MockToastrService }]
        }).compileComponents()

        fixture = TestBed.createComponent(LandingComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
