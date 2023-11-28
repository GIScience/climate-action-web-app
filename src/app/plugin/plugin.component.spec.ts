import {ComponentFixture, TestBed} from '@angular/core/testing'

import {PluginComponent} from './plugin.component'
import {HttpClientModule} from '@angular/common/http'
import {RouterModule} from '@angular/router'
import {PluginsComponent} from '../plugins/plugins.component'

describe('PluginComponent', () => {
    let component: PluginComponent
    let fixture: ComponentFixture<PluginComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                PluginComponent,
                PluginsComponent,
                RouterModule.forRoot([])
            ]
        })
        fixture = TestBed.createComponent(PluginComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
