import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { RouterModule } from '@angular/router'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, of } from 'rxjs'
import { MockToastrService } from '../../../../jest.mocks'
import { StorageService } from '../../storage.service'
import { ArtifactService } from '../artifact/artifact.service'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { ComputationDisplayEntity } from './computation.interface'
import { ComputationsIndexComponent } from './computations-index.component'

describe('ComputationsIndexComponent', () => {
    let component: ComputationsIndexComponent
    let fixture: ComponentFixture<ComputationsIndexComponent>

    let mockPluginService: Partial<PluginService>
    let mockStorageService: Partial<StorageService>
    let mockArtifactService: Partial<ArtifactService>
    let mockMapService: Partial<MapService>
    let mockMatDialog: { open: jest.Mock; closeAll: jest.Mock }

    let pluginRuns$: BehaviorSubject<ComputationDisplayEntity[]>

    beforeEach(async () => {
        pluginRuns$ = new BehaviorSubject<ComputationDisplayEntity[]>([])

        mockStorageService = {
            getPluginRuns: jest.fn(),
            getPluginRunsObservable: jest.fn().mockReturnValue(pluginRuns$.asObservable()),
            getPluginRunsPaginated: jest.fn().mockResolvedValue({
                documents: [],
                total: 0,
                hasMore: false
            }),
            getComputesByStatus: jest.fn().mockReturnValue([]),
            archiveComputation: jest.fn(),
            unarchiveComputation: jest.fn(),
            getNewRuns: jest.fn().mockReturnValue([]),
            getDemoRuns: jest.fn().mockReturnValue([]),
            getActiveArtifact: jest.fn(),
            saveActiveArtifact: jest.fn(),
            clearActiveArtifact: jest.fn(),
            markAsNew: jest.fn(),
            markAsViewed: jest.fn()
        }

        mockPluginService = {
            updateRunStatus: jest.fn(),
            getComputationMetadata: jest.fn(),
            setComputeState: jest.fn(),
            getComputationRunState: jest.fn(),
            collapsePluginCatalog: jest.fn(),
            getPluginNameById: jest.fn((id: string) => id),
            getPluginDetails: jest.fn().mockReturnValue(
                of({
                    plugin_id: 'test_plugin',
                    plugin_version: '1.0.0'
                })
            ),
            syncTasks$: new BehaviorSubject<void>(undefined),
            getPluginRuns: jest.fn().mockReturnValue(pluginRuns$.asObservable()),
            computeDemo: jest.fn(),
            storeNewComputes: jest.fn(() => Promise.resolve())
        }

        mockArtifactService = {
            getImage: jest.fn(),
            vector: new BehaviorSubject(null),
            raster: new BehaviorSubject(null)
        }
        mockMapService = {
            initMap: jest.fn(),
            highlightAoI: jest.fn(),
            removeFocusedLayer: jest.fn(),
            flyToExtent: jest.fn()
        }

        mockMapService.highlightAoI = jest.fn().mockReturnValue([0, 0, 1, 1])
        mockMatDialog = {
            open: jest.fn(),
            closeAll: jest.fn()
        }

        await TestBed.configureTestingModule({
            imports: [
                ComputationsIndexComponent,
                HttpClientTestingModule,
                NoopAnimationsModule,
                RouterModule.forRoot([]),
                TranslocoTestingModule.forRoot({ langs: { en: {}, de: {} }, translocoConfig: { defaultLang: 'en' } })
            ],
            providers: [
                { provide: PluginService, useValue: mockPluginService },
                { provide: StorageService, useValue: mockStorageService },
                { provide: ArtifactService, useValue: mockArtifactService },
                { provide: MapService, useValue: mockMapService },
                { provide: MatDialog, useValue: mockMatDialog },
                { provide: ToastrService, useClass: MockToastrService },
                provideTippyLoader(() => import('tippy.js')),
                provideTippyConfig({
                    defaultVariation: 'tooltip',
                    variations: {
                        tooltip: tooltipVariation,
                        popper: popperVariation
                    }
                })
            ]
        }).compileComponents()
    })

    beforeEach(fakeAsync(() => {
        mockStorageService.getComputesByStatus = jest.fn().mockReturnValue([])

        fixture = TestBed.createComponent(ComputationsIndexComponent)
        component = fixture.componentInstance

        component.formatTimestamp = jest.fn().mockReturnValue('Jan 1, 2023 12:00 PM')

        fixture.detectChanges()
        tick()
        discardPeriodicTasks()
    }))

    afterEach(fakeAsync(() => {
        expect(fixture.debugElement.queryAll(By.css('.computations-index')).length).toBe(1)
        tick()
        discardPeriodicTasks()
        flush()
    }))

    it('given no runs should create an empty computation index view', fakeAsync(() => {
        expect(component).toBeTruthy()
        expect(mockPluginService.updateRunStatus).not.toHaveBeenCalled()

        expect(fixture.debugElement.queryAll(By.css('.parent-computation')).length).toBe(0)
        expect(fixture.debugElement.queryAll(By.css('.child-computation')).length).toBe(0)

        discardPeriodicTasks()
    }))

    it('given a completed run should create an expandable computation', fakeAsync(() => {
        const testRun = {
            aoiName: 'Test AOI',
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'SUCCESS',
            request_ts: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationDisplayEntity

        mockStorageService.getComputesByStatus = jest.fn().mockReturnValue([testRun])
        mockStorageService.getPluginRunsPaginated = jest.fn().mockResolvedValue({
            documents: [testRun],
            total: 1,
            hasMore: false
        })

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of({
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    request_ts: new Date('2023-09-27T16:42:52+01:00'),
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
                })
            }
            return of()
        })

        component.currentRuns = [testRun]
        component.initializeSuccessfulRuns()
        tick()
        fixture.detectChanges()

        const parentComputation = fixture.debugElement.query(By.css('.parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        fixture.detectChanges()
        tick()

        const childComputations = fixture.debugElement.queryAll(By.css('.child-computation'))
        expect(childComputations.length).toBe(1)

        tick(2000)
        discardPeriodicTasks()
    }))

    it('should archive a computation and update the list', fakeAsync(() => {
        const initialRun = {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'SUCCESS',
            request_ts: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationDisplayEntity

        component.currentRuns = [initialRun]
        component.archivedComputations = []

        component.archiveComputation(initialRun.correlation_uuid)

        expect(mockStorageService.archiveComputation).toHaveBeenCalledWith(initialRun.correlation_uuid)

        discardPeriodicTasks()
    }))

    it('should display artifact errors next to the computation', fakeAsync(() => {
        const testRun = {
            aoiName: 'Test AOI',
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'SUCCESS',
            request_ts: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationDisplayEntity

        mockStorageService.getComputesByStatus = jest.fn().mockReturnValue([testRun])
        mockStorageService.getPluginRunsPaginated = jest.fn().mockResolvedValue({
            documents: [testRun],
            total: 1,
            hasMore: false
        })

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of({
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    request_ts: new Date('2023-09-27T16:42:52+01:00'),
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
                    message: '',
                    artifact_errors: {
                        'Failing Indicator': 'Error message'
                    }
                })
            }
            return of()
        })

        component.currentRuns = [testRun]
        component.initializeSuccessfulRuns()
        tick()
        fixture.detectChanges()

        const artifactErrorsIcon = fixture.debugElement.query(By.css('.artifact-errors'))
        expect(artifactErrorsIcon).toBeTruthy()

        tick(2000)
        discardPeriodicTasks()
    }))

    it('should unarchive a computation and update the list', fakeAsync(() => {
        const archivedRun = {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'SUCCESS',
            request_ts: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationDisplayEntity

        component.currentRuns = []
        component.archivedComputations = [archivedRun]

        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(of())
        component.unarchiveComputation(archivedRun.correlation_uuid)

        expect(mockStorageService.unarchiveComputation).toHaveBeenCalledWith(archivedRun.correlation_uuid)

        discardPeriodicTasks()
    }))

    it('should fetch a demo computation when no demos exist and the plugin is configured for demos', fakeAsync(() => {
        component.hasDemoConfig = true
        component.demoRuns = []
        component.pluginId = 'test_plugin'
        component.currentRuns = []

        const demoResponse = { correlation_uuid: 'demo-uuid-123' }
        const stateResponse = { state: 'SUCCESS' }

        mockPluginService.computeDemo = jest.fn().mockReturnValue(of(demoResponse))
        mockPluginService.getComputationRunState = jest.fn().mockReturnValue(of(stateResponse))
        mockPluginService.storeNewComputes = jest.fn(() => Promise.resolve())

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === 'demo-uuid-123') {
                return of({
                    correlation_uuid: 'demo-uuid-123',
                    request_ts: new Date(),
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
                            name: 'Demo'
                        }
                    },
                    artifacts: [],
                    plugin_info: {
                        plugin_id: 'test_plugin',
                        plugin_version: '1.0.0'
                    },
                    status: 'SUCCESS',
                    message: ''
                })
            }
            return of({})
        })

        component.fetchDemoComputation()
        tick(100)

        expect(mockPluginService.computeDemo).toHaveBeenCalledWith('test_plugin')

        const expectedCompute = {
            correlation_uuid: 'demo-uuid-123',
            pluginId: 'test_plugin',
            request_ts: expect.any(Date),
            aoiName: 'Demo',
            status: 'SUCCESS',
            flags: ['DEMO']
        }
        expect(mockPluginService.storeNewComputes).toHaveBeenCalledWith(expect.objectContaining(expectedCompute))

        expect(mockPluginService.getComputationMetadata).toHaveBeenCalledWith('demo-uuid-123')

        discardPeriodicTasks()
    }))

    it('should successfully import a new computation', fakeAsync(() => {
        component.currentRuns = []

        const mockMetadata = {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
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
                properties: { name: 'Imported AOI' }
            },
            plugin_info: {
                id: 'test_plugin',
                version: '1.0.0'
            },
            status: 'SUCCESS'
        }

        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(of(mockMetadata))
        const fetchAndProcessSpy = jest.spyOn(component, 'fetchAndProcessComputations')

        component.importComputation('8a897536-c4b4-4e5a-9d70-50430183ac66')
        tick()

        const expectedComputation = {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            request_ts: mockMetadata.request_ts,
            status: 'SUCCESS',
            aoiName: 'Imported AOI',
            flags: ['IMPORTED']
        }

        expect(component.currentRuns).toHaveLength(1)
        expect(component.currentRuns[0]).toEqual(expectedComputation)

        expect(mockPluginService.getComputationMetadata).toHaveBeenCalledWith('8a897536-c4b4-4e5a-9d70-50430183ac66')
        expect(mockPluginService.storeNewComputes).toHaveBeenCalledWith(expectedComputation)
        expect(fetchAndProcessSpy).toHaveBeenCalledWith(expectedComputation)

        discardPeriodicTasks()
    }))

    it('should open dialog with params and requested params', () => {
        const computation = {
            artifacts: [],
            correlation_uuid: 'test-id',
            request_ts: new Date('2024-01-01T00:00:00Z'),
            status: 'SUCCESS',
            artifact_errors: {},
            params: { foo: 'bar' },
            requested_params: { foo: 'bar' }
        } as ComputationDisplayEntity

        component.viewParameters(computation)

        expect(mockMatDialog.open).toHaveBeenCalledWith(
            component.parametersDialog,
            expect.objectContaining({
                data: {
                    params: computation.params,
                    requestedParams: computation.requested_params
                },
                autoFocus: false
            })
        )
    })

    it('should format values and handle nested structures', () => {
        const entries = component.getParameterEntries({
            enabled: true,
            names: ['alpha', 'beta'],
            config: { max_value: 3 }
        })

        expect(entries).toEqual([
            { key: 'enabled', value: 'Yes' },
            { key: 'names', value: 'alpha, beta' },
            { key: 'config', value: 'Max Value: 3' }
        ])
    })

    it('requested param helpers should detect requested params', () => {
        const params = { foo: 1, bar: 2 }
        const requested = { bar: 2 }

        expect(component.hasUserRequestedParams(params, requested)).toBe(true)
        expect(component.isUserRequestedParam('bar', requested)).toBe(true)
        expect(component.isUserRequestedParam('foo', requested)).toBe(false)
    })
})
