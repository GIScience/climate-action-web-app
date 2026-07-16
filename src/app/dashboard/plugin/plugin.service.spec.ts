import { HttpClient, HttpClientModule } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { jest } from '@jest/globals'
import { of } from 'rxjs'
import { getTranslocoTestingModule } from '../../../../jest.mocks'
import { StorageService } from '../../storage.service'
import { ComputationID } from '../computations-index/computation.interface'
import { Plugin } from './plugin.interface'
import { PluginService } from './plugin.service'

describe('PluginService', () => {
    let service: PluginService
    let storageService: StorageService
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
                summary: 'An image.',
                description: 'The image is under CC0 license.',
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                filename: '09c8eabf-4b73-452c-b3bc-47310a91eaa7_blueprint_image.png',
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
        id: 'blueprint_plugin',
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

        const mockStorageService = {
            getComputesByStatus: jest.fn().mockReturnValue([test_plugin_run, test_plugin_run]),
            storeNewCompute: jest.fn(() => Promise.resolve()),
            updateComputation: jest.fn(() => Promise.resolve()),
            getPluginRuns: jest.fn().mockReturnValue([test_plugin_run])
        }

        TestBed.configureTestingModule({
            imports: [HttpClientModule, getTranslocoTestingModule()],
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpClientSpy
                },
                {
                    provide: StorageService,
                    useValue: mockStorageService
                }
            ]
        })
        service = TestBed.inject(PluginService)
        storageService = TestBed.inject(StorageService)
        localStorage.clear()
    })

    it('should get plugin list', () => {
        httpClientSpy.get.mockReturnValue(of<Plugin[]>([test_plugin, test_plugin]))

        service.getPlugins().subscribe(plugins => {
            expect(plugins).toHaveLength(2)
        })

        expect(httpClientSpy.get).toHaveBeenCalledTimes(1)
    })

    it('should populate plugin name cache when getPlugins is called', () => {
        httpClientSpy.get.mockReturnValue(of<Plugin[]>([test_plugin]))

        service.getPlugins().subscribe()

        expect(service.getPluginNameById('blueprint_plugin')).toBe('Test 1')
    })

    it('should fall back to derivePluginNameFromId for uncached plugins', () => {
        expect(service.getPluginNameById('carbon_footprint_calculator')).toBe('Carbon Footprint Calculator')
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
            expect(computations.aoi).toBeDefined()
            expect(computations.aoi.properties?.['name']).toBe('Test AOI')
        })

        expect(httpClientSpy.get).toHaveBeenCalledTimes(1)
    })

    it('should get computes by status', () => {
        expect(storageService.getComputesByStatus(['PENDING', 'STARTED', 'SUCCESS'])).toHaveLength(2)
    })

    it('should store computes', async () => {
        await service.storeNewComputes({
            correlation_uuid: '1fbeed00-e9b7-4f54-bae7-18f64bd33ea6',
            pluginId: 'test_plugin',
            aoiName: 'Test Area',
            status: 'PENDING',
            request_ts: new Date()
        })
        expect(storageService.storeNewCompute).toHaveBeenCalled()
    })

    it('should update run status', async () => {
        await service.updateRunStatus('1fbeed00-e9b7-4f54-bae7-18f64bd33ea6', 'PENDING')
        expect(storageService.updateComputation).toHaveBeenCalledWith('1fbeed00-e9b7-4f54-bae7-18f64bd33ea6', {
            status: 'PENDING'
        })
    })
})
