import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterModule } from '@angular/router'
import { ToastrService } from 'ngx-toastr'
import { getTranslocoTestingModule, MockToastrService } from '../../../testing/test-helpers'
import { StorageService } from '../../storage.service'
import { LandingComponent } from './landing.component'

describe('LandingComponent', () => {
    let component: LandingComponent
    let fixture: ComponentFixture<LandingComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, LandingComponent, RouterModule.forRoot([]), getTranslocoTestingModule()],
            providers: [{ provide: ToastrService, useClass: MockToastrService }]
        }).compileComponents()

        fixture = TestBed.createComponent(LandingComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
        await TestBed.inject(StorageService).ready
        await new Promise(resolve => setTimeout(resolve))
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
