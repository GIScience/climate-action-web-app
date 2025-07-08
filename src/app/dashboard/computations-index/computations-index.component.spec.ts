import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { RouterModule } from '@angular/router'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ToastrService } from 'ngx-toastr'
import { Feature } from 'ol'
import GeoJSON from 'ol/format/GeoJSON'
import { MultiPolygon } from 'ol/geom'
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

    let pluginRuns$: BehaviorSubject<ComputationDisplayEntity[]>

    beforeEach(async () => {
        pluginRuns$ = new BehaviorSubject<ComputationDisplayEntity[]>([])

        mockStorageService = {
            getPluginRuns: jest.fn(),
            getPluginRunsObservable: jest.fn().mockReturnValue(pluginRuns$.asObservable()),
            getComputesByStatus: jest.fn(),
            getArchivedRuns: jest.fn(),
            archiveComputation: jest.fn(),
            unarchiveComputation: jest.fn(),
            savePluginRuns: jest.fn(),
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
            getComputationState: jest.fn(),
            collapsePluginCatalog: jest.fn(),
            getPluginDetails: jest.fn().mockReturnValue(
                of({
                    plugin_id: 'test_plugin',
                    plugin_version: '1.0.0'
                })
            ),
            syncTasks$: new BehaviorSubject<void>(undefined),
            getPluginRuns: jest.fn().mockReturnValue(pluginRuns$.asObservable()),
            computeDemo: jest.fn(),
            storeNewComputes: jest.fn(),
            refreshComputesInLS: jest.fn()
        }

        mockArtifactService = {
            getImage: jest.fn()
        }
        mockMapService = {
            initMap: jest.fn(),
            highlightAoI: jest.fn(),
            removeFocusedLayer: jest.fn()
        }

        mockMapService.highlightAoI = jest.fn().mockReturnValue([0, 0, 1, 1])

        await TestBed.configureTestingModule({
            imports: [
                ComputationsIndexComponent,
                HttpClientTestingModule,
                NoopAnimationsModule,
                RouterModule.forRoot([])
            ],
            providers: [
                { provide: PluginService, useValue: mockPluginService },
                { provide: StorageService, useValue: mockStorageService },
                { provide: ArtifactService, useValue: mockArtifactService },
                { provide: MapService, useValue: mockMapService },
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
        mockStorageService.getArchivedRuns = jest.fn().mockReturnValue([])

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
            timestamp: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationDisplayEntity

        mockStorageService.getComputesByStatus = jest.fn().mockReturnValue([testRun])

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of({
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    timestamp: new Date('2023-09-27T16:42:52+01:00'),
                    params: {},
                    aoi: new GeoJSON().readFeature({
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
                    }) as Feature<MultiPolygon>,
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
                })
            }
            return of()
        })

        component.ngOnInit()
        fixture.detectChanges()
        tick()

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
            timestamp: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationDisplayEntity

        component.currentRuns = [initialRun]
        component.archivedComputations = []

        component.archiveComputation(initialRun.correlation_uuid)

        expect(mockStorageService.archiveComputation).toHaveBeenCalledWith(initialRun.correlation_uuid)
        expect(mockStorageService.getComputesByStatus).toHaveBeenCalled()
        expect(mockStorageService.getArchivedRuns).toHaveBeenCalled()

        discardPeriodicTasks()
    }))

    it('should display artifact errors next to the computation', fakeAsync(() => {
        const testRun = {
            aoiName: 'Test AOI',
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'SUCCESS',
            timestamp: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationDisplayEntity

        mockStorageService.getComputesByStatus = jest.fn().mockReturnValue([testRun])

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of({
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    timestamp: new Date('2023-09-27T16:42:52+01:00'),
                    params: {},
                    aoi: new GeoJSON().readFeature({
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
                    }) as Feature<MultiPolygon>,
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
                    message: '',
                    artifact_errors: {
                        'Failing Indicator': 'Error message'
                    }
                })
            }
            return of()
        })

        component.ngOnInit()
        fixture.detectChanges()
        tick()

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
            timestamp: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationDisplayEntity

        component.currentRuns = []
        component.archivedComputations = [archivedRun]

        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(of())
        component.unarchiveComputation(archivedRun.correlation_uuid)

        expect(mockStorageService.unarchiveComputation).toHaveBeenCalledWith(archivedRun.correlation_uuid)
        expect(mockStorageService.getComputesByStatus).toHaveBeenCalled()
        expect(mockStorageService.getArchivedRuns).toHaveBeenCalled()

        discardPeriodicTasks()
    }))

    it('should fetch a demo computation when no demos exist and the plugin is configured for demos', fakeAsync(() => {
        component.demoConfig = true
        component.demoRuns = []
        component.pluginId = 'test_plugin'

        const demoResponse = { correlation_uuid: 'demo-uuid-123' }
        const stateResponse = { state: 'SUCCESS' }

        mockPluginService.computeDemo = jest.fn().mockReturnValue(of(demoResponse))
        mockPluginService.getComputationState = jest.fn().mockReturnValue(of(stateResponse))
        mockPluginService.storeNewComputes = jest.fn()

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === 'demo-uuid-123') {
                return of({
                    correlation_uuid: 'demo-uuid-123',
                    timestamp: new Date(),
                    params: {},
                    aoi: new GeoJSON().readFeature({
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
                    }) as Feature<MultiPolygon>,
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

        const fetchDemoSpy = jest.spyOn(component, 'fetchDemoComputation')

        component.ngOnInit()
        fixture.detectChanges()
        tick()

        expect(fetchDemoSpy).toHaveBeenCalled()
        expect(mockPluginService.computeDemo).toHaveBeenCalledWith('test_plugin')

        const expectedCompute = {
            correlation_uuid: 'demo-uuid-123',
            pluginId: 'test_plugin',
            timestamp: expect.any(Date),
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
            timestamp: new Date('2023-09-27T16:42:52+01:00'),
            params: {},
            aoi: new GeoJSON().readFeature({
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
            }) as Feature<MultiPolygon>,
            plugin_info: {
                plugin_id: 'test_plugin',
                plugin_version: '1.0.0'
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
            timestamp: mockMetadata.timestamp,
            status: 'SUCCESS',
            aoiName: 'Imported AOI'
        }

        expect(component.currentRuns).toHaveLength(1)
        expect(component.currentRuns[0]).toEqual(expectedComputation)

        expect(mockPluginService.getComputationMetadata).toHaveBeenCalledWith('8a897536-c4b4-4e5a-9d70-50430183ac66')
        expect(mockPluginService.refreshComputesInLS).toHaveBeenCalledWith(component.currentRuns)
        expect(fetchAndProcessSpy).toHaveBeenCalledWith(expectedComputation)

        discardPeriodicTasks()
    }))
})
