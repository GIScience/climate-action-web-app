import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { SearchComponent } from './search.component'

describe('SearchComponent', () => {
    let component: SearchComponent
    let fixture: ComponentFixture<SearchComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                SearchComponent,
                HttpClientTestingModule,
                TranslocoTestingModule.forRoot({ langs: { en: {}, de: {} }, translocoConfig: { defaultLang: 'en' } })
            ]
        }).compileComponents()

        fixture = TestBed.createComponent(SearchComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
