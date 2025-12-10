import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { PageNotFoundComponent } from './page-not-found.component'

describe('PageNotFoundComponent', () => {
    let component: PageNotFoundComponent
    let fixture: ComponentFixture<PageNotFoundComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                PageNotFoundComponent,
                TranslocoTestingModule.forRoot({ langs: { en: {}, de: {} }, translocoConfig: { defaultLang: 'en' } })
            ]
        }).compileComponents()

        fixture = TestBed.createComponent(PageNotFoundComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
