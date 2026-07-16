import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { getTranslocoTestingModule } from '../../../../jest.mocks'
import { SearchComponent } from './search.component'

describe('SearchComponent', () => {
    let component: SearchComponent
    let fixture: ComponentFixture<SearchComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SearchComponent, HttpClientTestingModule, getTranslocoTestingModule()]
        }).compileComponents()

        fixture = TestBed.createComponent(SearchComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
