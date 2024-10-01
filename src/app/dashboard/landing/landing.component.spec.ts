import {ComponentFixture, TestBed} from '@angular/core/testing'
import {LandingComponent} from './landing.component'
import {HttpClientTestingModule} from '@angular/common/http/testing'

describe('LandingComponent', () => {
    let component: LandingComponent
    let fixture: ComponentFixture<LandingComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, LandingComponent]
        })
            .compileComponents()

        fixture = TestBed.createComponent(LandingComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
