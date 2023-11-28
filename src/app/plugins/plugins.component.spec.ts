import {ComponentFixture, TestBed} from '@angular/core/testing'
import {PluginsComponent} from './plugins.component'
import {HttpClientModule} from '@angular/common/http'

describe('PluginsComponent', () => {
    let component: PluginsComponent
    let fixture: ComponentFixture<PluginsComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                PluginsComponent

            ]
        })
        fixture = TestBed.createComponent(PluginsComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
