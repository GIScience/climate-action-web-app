import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterModule } from '@angular/router'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { ToastrModule } from 'ngx-toastr'
import { PluginCatalogComponent } from '../plugin-catalog/plugin-catalog.component'
import { PluginComponent } from './plugin.component'
import { Plugin } from './plugin.interface'

describe('PluginComponent', () => {
    let component: PluginComponent
    let fixture: ComponentFixture<PluginComponent>

    const test_plugin = {
        name: 'Test 1',
        version: '0.0.1',
        concerns: [
            {
                concern: 'ghg_emission'
            }
        ],
        purpose: 'This Plugin serves no purpose besides being a blueprint for real plugins.',
        methodology: 'This Plugin uses no methodology because it does nothing.',
        sources: [
            {
                url: 'https://some.url.com',
                ENTRYTYPE: 'misc',
                ID: '1',
                title: 'Test 1',
                author: 'Test 1',
                year: '2023'
            },
            {
                ENTRYTYPE: 'misc',
                ID: '2',
                title: 'Test 2',
                author: 'Test 2',
                year: '2024',
                note: '\\url{https://another.url.com}'
            },
            {
                url: 'https://some.url.com',
                ENTRYTYPE: 'misc',
                ID: '3',
                title: 'Test 3',
                author: 'Test 3',
                year: '2025',
                note: '\\url{https://another.url.com}'
            }
        ],
        assets: {
            icon: '...'
        },
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
                RouterModule.forRoot([]),
                TranslocoTestingModule.forRoot({ langs: { en: {}, de: {} }, translocoConfig: { defaultLang: 'en' } }),
                ToastrModule.forRoot()
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
                url: 'https://some.url.com',
                ENTRYTYPE: 'misc',
                ID: '1',
                title: 'Test 1',
                author: 'Test 1',
                year: '2023'
            },
            {
                url: 'https://another.url.com',
                ENTRYTYPE: 'misc',
                ID: '2',
                title: 'Test 2',
                author: 'Test 2',
                year: '2024',
                note: '\\url{https://another.url.com}'
            },
            {
                url: 'https://some.url.com',
                ENTRYTYPE: 'misc',
                ID: '3',
                title: 'Test 3',
                author: 'Test 3',
                year: '2025',
                note: '\\url{https://another.url.com}'
            }
        ])
    })
})
