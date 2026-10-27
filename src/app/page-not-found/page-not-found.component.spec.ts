import { ComponentFixture, TestBed } from '@angular/core/testing'
import { getTranslocoTestingModule } from '../../testing/test-helpers'
import { PageNotFoundComponent } from './page-not-found.component'

describe('PageNotFoundComponent', () => {
    let component: PageNotFoundComponent
    let fixture: ComponentFixture<PageNotFoundComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PageNotFoundComponent, getTranslocoTestingModule()]
        }).compileComponents()

        fixture = TestBed.createComponent(PageNotFoundComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
