import {ComponentFixture, TestBed} from '@angular/core/testing'

import {PluginComponent} from './plugin.component'
import {HttpClientModule} from '@angular/common/http'
import {RouterModule} from '@angular/router'
import {PluginCatalogComponent} from '../plugin-catalog/plugin-catalog.component'
import {Plugin} from './plugin.interface'

describe('PluginComponent', () => {
    let component: PluginComponent
    let fixture: ComponentFixture<PluginComponent>

    const test_plugin = {
        name: 'Test 1',
        assets: {
            icon: '...'
        },
        version: '0.0.1',
        concerns: [
            {
                concern: 'ghg_emission'
            }
        ],
        purpose: 'This Plugin serves no purpose besides being a blueprint for real plugins.',
        methodology: 'This Plugin uses no methodology because it does nothing.',
        attribution: '',
        sources: [
            {
                url: 'http://some.url.com'
            },
            {
                note: '\\url{http://another.url.com}'
            },
            {
                url: 'http://some.url.com',
                note: '\\url{http://another.url.com}'
            }
        ],
        plugin_id: 'blueprint_plugin',
        operator_schema: {},
        library_version: '2.6.4'
    } as Plugin

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                PluginComponent,
                PluginCatalogComponent,
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

    it('should update url when present in notes', () => {
        expect(component.processSourceUrls(test_plugin).sources).toEqual([
            {
                url: 'http://some.url.com'
            },
            {
                url: 'http://another.url.com',
                note: '\\url{http://another.url.com}'
            },
            {
                url: 'http://some.url.com',
                note: '\\url{http://another.url.com}'
            }
        ])
    })
})
