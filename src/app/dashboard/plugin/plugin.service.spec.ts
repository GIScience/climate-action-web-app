import {TestBed} from '@angular/core/testing'

import {PluginService} from './plugin.service'
import {HttpClient, HttpClientModule} from '@angular/common/http'
import {of} from 'rxjs'
import {Plugin, PluginCorrelator, PluginRun} from './plugin.interface'
import SpyObj = jasmine.SpyObj

describe('PluginService', () => {
    let service: PluginService
    let httpClientSpy: SpyObj<HttpClient>

    const test_artifact = {
        name: 'test_artifact',
        modality: 'IMAGE',
        file_path: './',
        summary: 'artifact summary',
        description: 'artifact description',
        correlation_uuid: '1fbeed00-e9b7-4f54-bae7-18f64bd33ea6',
        params: {},
        store_id: '2fbeed00-e9b7-4f54-bae7-18f64bd33ea6'
    }

    const test_correlator = {
        correlation_uuid: '1fbeed00-e9b7-4f54-bae7-18f64bd33ea6'
    } as PluginCorrelator

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
        attribution: '',
        sources: [
            {
                pages: '14-15',
                volume: '2',
                journal: 'J. Geophys. Res.',
                year: '1954',
                title: '"Nothing Particular in this Years History"',
                author: 'J. G. Smith and H. K. Weston',
                ENTRYTYPE: 'article',
                ID: 'smit54'
            },
            {
                pages: '345-678',
                volume: '46',
                journal: 'Psych. Today',
                year: '1900',
                title: 'Things that Go Dark in the Night',
                author: 'R. J. Green and U. P. Fred and W. P. Norbert',
                ENTRYTYPE: 'article',
                ID: 'gree00'
            }
        ],
        plugin_id: 'blueprint_plugin',
        operator_schema: {},
        library_version: '2.6.4',
        assets: {icon: '...'}
    } as Plugin

    const test_plugin_run = {
        correlation_uuid: '1fbeed00-e9b7-4f54-bae7-18f64bd33ea6',
        pluginId: 'test_plugin',
        pluginName: 'test plugin',
        status: 'scheduled',
        timestamp: new Date('2023-09-27T16:42:52+01:00')
    }

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['post', 'get'])

        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpClientSpy
                }
            ]
        })
        service = TestBed.inject(PluginService)
        localStorage.clear()
    })

    it('should be created', () => {
        expect(service).toBeTruthy()
    })

    it('should get plugin list', () => {
        httpClientSpy.get.withArgs('/api/v1/gateway/plugin/').and
            .returnValue(of<Plugin[]>([test_plugin, test_plugin]))

        service.getPlugins().subscribe(plugins => {
            expect(plugins).toHaveSize(2)
        })

        expect(httpClientSpy.get.calls.count()).toBe(1)
    })

    it('should get single plugin', () => {
        httpClientSpy.get.withArgs('/api/v1/gateway/plugin/test').and
            .returnValue(of<Plugin>(test_plugin))

        service.getPluginDetails('test').subscribe(plugins => {
            expect(plugins).toBe(test_plugin)
        })

        expect(httpClientSpy.get.calls.count()).toBe(1)
    })

    it('should invoke plugin computation', () => {
        const computeRequest = {
            aoi: {
                type: 'Feature',
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [[[[null, null]]]]
                },
                properties: {
                    name: 'Test Area',
                    id: 'test-id'
                }
            },
            params: {
                compute_param_1: 1
            }
        }

        httpClientSpy.post.withArgs('/api/v1/gateway/plugin/test', computeRequest).and
            .returnValue(of(test_correlator))

        service.computePlugin('test', computeRequest).subscribe(test_correlator => {
            expect(test_correlator).toEqual(test_correlator)
        })

        expect(httpClientSpy.post.calls.count()).toBe(1)
    })

    it('should get artifacts', () => {
        httpClientSpy.get.withArgs('/api/v1/gateway/store/1fbeed00-e9b7-4f54-bae7-18f64bd33ea6/metadata/').and
            .returnValue(of([test_correlator, test_artifact]))

        service.getArtifactsMetadata('1fbeed00-e9b7-4f54-bae7-18f64bd33ea6').subscribe(artifacts => {
            expect(artifacts).toHaveSize(2)
        })

        expect(httpClientSpy.get.calls.count()).toBe(1)
    })

    it('should get computes', () => {
        expect(localStorage.getItem('plugin_runs')).toBe(null)
        localStorage.setItem('plugin_runs', JSON.stringify([test_plugin_run, test_plugin_run]))
        expect(service.getComputesFromLS()).toHaveSize(2)
    })

    it('should store computes', () => {
        expect(localStorage.getItem('plugin_runs')).toBe(null)
        service.storeNewComputes('1fbeed00-e9b7-4f54-bae7-18f64bd33ea6', test_plugin)
        const item = localStorage.getItem('plugin_runs')
        if (item) {
            expect(JSON.parse(item)).toHaveSize(1)
        } else {
            fail()
        }
    })

    it('should refresh compute', () => {
        expect(localStorage.getItem('plugin_runs')).toBe(null)
        service.refreshComputesInLS([test_plugin_run] as PluginRun[])

        const item = localStorage.getItem('plugin_runs')
        if (item) {
            expect(JSON.parse(item)).toHaveSize(1)
        } else {
            fail()
        }
    })

    it('should update run status when run persisted', () => {
        localStorage.setItem('plugin_runs', JSON.stringify([test_plugin_run]))
        let item = localStorage.getItem('plugin_runs')
        if (item) {
            expect(JSON.parse(item)[0]['status']).toEqual('scheduled')
        } else {
            fail()
        }

        service.updateRunStatus('1fbeed00-e9b7-4f54-bae7-18f64bd33ea6', 'PENDING')

        item = localStorage.getItem('plugin_runs')
        if (item) {
            expect(JSON.parse(item)[0]['status']).toEqual('PENDING')
        } else {
            fail()
        }
    })

    it('should update run status when run not persisted', () => {
        localStorage.setItem('plugin_runs', JSON.stringify([test_plugin_run]))
        let item = localStorage.getItem('plugin_runs')
        if (item) {
            expect(JSON.parse(item)[0]['status']).toEqual('scheduled')
        } else {
            fail()
        }

        service.updateRunStatus('2fbeed00-e9b7-4f54-bae7-18f64bd33ea6', 'PENDING')

        item = localStorage.getItem('plugin_runs')
        if (item) {
            expect(JSON.parse(item)[0]['status']).toEqual('scheduled')
        } else {
            fail()
        }
    })
})

