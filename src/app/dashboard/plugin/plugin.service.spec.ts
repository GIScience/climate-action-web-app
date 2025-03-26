import { HttpClient, HttpClientModule } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { jest } from '@jest/globals'
import { Feature } from 'ol'
import { MultiPolygon } from 'ol/geom'
import { of } from 'rxjs'
import { ComputationEntity, ComputationID } from '../computations-index/computation.interface'
import { Plugin } from './plugin.interface'
import { PluginService } from './plugin.service'

describe('PluginService', () => {
    let service: PluginService
    let httpClientSpy: {
        post: jest.Mock
        get: jest.Mock
    }

    const test_computation = {
        correlation_uuid: '1fbeed00-e9b7-4f54-bae7-18f64bd33ea6',
        timestamp: new Date('2023-09-27T16:42:52+01:00'),
        params: {},
        aoi: {
            type: 'Feature',
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [0, 0],
                            [1, 0],
                            [1, 1],
                            [0, 1],
                            [0, 0]
                        ]
                    ]
                ]
            },
            properties: {
                name: 'Test AOI'
            }
        },
        artifacts: [
            {
                name: 'Image',
                modality: 'IMAGE',
                primary: true,
                file_path: 'test_image.png',
                summary: 'An image.',
                description: 'The image is under CC0 license.',
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                store_id: '09c8eabf-4b73-452c-b3bc-47310a91eaa7_blueprint_image.png',
                attachments: {}
            }
        ],
        plugin_info: {
            plugin_id: 'test_plugin',
            plugin_version: '1.0.0'
        },
        status: 'SUCCESS',
        message: ''
    }

    const test_correlator = {
        correlation_uuid: '1fbeed00-e9b7-4f54-bae7-18f64bd33ea6'
    } as ComputationID

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
        assets: { icon: '...' }
    } as Plugin

    const test_plugin_run = {
        correlation_uuid: '1fbeed00-e9b7-4f54-bae7-18f64bd33ea6',
        pluginId: 'test_plugin',
        pluginName: 'test plugin',
        status: 'PENDING',
        timestamp: new Date('2023-09-27T16:42:52+01:00')
    }

    beforeEach(() => {
        httpClientSpy = {
            post: jest.fn().mockImplementation(() => of({})),
            get: jest.fn().mockImplementation(() => of({}))
        }

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
        httpClientSpy.get.mockReturnValue(of<Plugin[]>([test_plugin, test_plugin]))

        service.getPlugins().subscribe(plugins => {
            expect(plugins).toHaveLength(2)
        })

        expect(httpClientSpy.get).toHaveBeenCalledTimes(1)
    })

    it('should get single plugin', () => {
        httpClientSpy.get.mockReturnValue(of<Plugin>(test_plugin))

        service.getPluginDetails('test').subscribe(plugins => {
            expect(plugins).toBe(test_plugin)
        })

        expect(httpClientSpy.get).toHaveBeenCalledTimes(1)
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

        httpClientSpy.post.mockReturnValue(of(test_correlator))

        service.computePlugin('test', computeRequest).subscribe(test_correlator => {
            expect(test_correlator).toEqual(test_correlator)
        })

        expect(httpClientSpy.post).toHaveBeenCalledTimes(1)
    })

    it('should get computations', () => {
        httpClientSpy.get.mockReturnValue(of(test_computation))

        service.getComputationMetadata('1fbeed00-e9b7-4f54-bae7-18f64bd33ea6').subscribe(computations => {
            expect(computations.aoi).toBeInstanceOf(Feature<MultiPolygon>)
        })

        expect(httpClientSpy.get).toHaveBeenCalledTimes(1)
    })

    it('should get computes', () => {
        expect(localStorage.getItem('plugin_runs')).toBe(null)
        localStorage.setItem('plugin_runs', JSON.stringify([test_plugin_run, test_plugin_run]))
        expect(service.getComputesFromLS(['PENDING', 'STARTED', 'SUCCESS'])).toHaveLength(2)
    })

    it('should store computes', () => {
        expect(localStorage.getItem('plugin_runs')).toBe(null)
        service.storeNewComputes('1fbeed00-e9b7-4f54-bae7-18f64bd33ea6', test_plugin)
        const item = localStorage.getItem('plugin_runs')
        if (item) {
            expect(JSON.parse(item)).toHaveLength(1)
        } else {
            fail()
        }
    })

    it('should refresh compute', () => {
        expect(localStorage.getItem('plugin_runs')).toBe(null)
        service.refreshComputesInLS([test_plugin_run] as ComputationEntity[])

        const item = localStorage.getItem('plugin_runs')
        if (item) {
            expect(JSON.parse(item)).toHaveLength(1)
        } else {
            fail()
        }
    })

    it('should update run status when run persisted', () => {
        localStorage.setItem('plugin_runs', JSON.stringify([test_plugin_run]))
        let item = localStorage.getItem('plugin_runs')
        if (item) {
            expect(JSON.parse(item)[0]['status']).toEqual('PENDING')
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
            expect(JSON.parse(item)[0]['status']).toEqual('PENDING')
        } else {
            fail()
        }

        service.updateRunStatus('2fbeed00-e9b7-4f54-bae7-18f64bd33ea6', 'PENDING')

        item = localStorage.getItem('plugin_runs')
        if (item) {
            expect(JSON.parse(item)[0]['status']).toEqual('PENDING')
        } else {
            fail()
        }
    })
})
