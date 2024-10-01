import {ComponentFixture, TestBed} from '@angular/core/testing'
import {PluginCatalogComponent} from './plugin-catalog.component'
import {HttpClientModule} from '@angular/common/http'

describe('PluginCatalogComponent', () => {
    let component: PluginCatalogComponent
    let fixture: ComponentFixture<PluginCatalogComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                PluginCatalogComponent

            ]
        })
        fixture = TestBed.createComponent(PluginCatalogComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
