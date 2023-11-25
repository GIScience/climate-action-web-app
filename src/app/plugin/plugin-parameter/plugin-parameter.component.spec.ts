import {ComponentFixture, TestBed} from '@angular/core/testing'

import {PluginParameterComponent} from './plugin-parameter.component'
import {HttpClientModule} from "@angular/common/http"
import {FormlyModule} from "@ngx-formly/core"
import {ReactiveFormsModule} from "@angular/forms"

describe('PluginParameterComponent', () => {
    let component: PluginParameterComponent
    let fixture: ComponentFixture<PluginParameterComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                FormlyModule.forRoot(),
                PluginParameterComponent,
                ReactiveFormsModule,
                HttpClientModule
            ]
        })
        fixture = TestBed.createComponent(PluginParameterComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
