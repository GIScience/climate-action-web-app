import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, flush, tick } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { ActivatedRoute } from '@angular/router'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, of } from 'rxjs'
import { MockToastrService } from '../../../../jest.mocks'
import { StorageService } from '../../storage.service'
import { ArtifactEntity } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationDisplayEntity, ComputationMetadata } from '../computations-index/computation.interface'
import { ComputationsIndexComponent } from '../computations-index/computations-index.component'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { ComputationComponent } from './computation.component'

describe('ComputationComponent', () => {
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
            getPluginRunsPaginated: jest.fn().mockResolvedValue({
                documents: [],
                total: 0,
                hasMore: false
            }),
            getNewRuns: jest.fn().mockReturnValue([]),
            getDemoRuns: jest.fn().mockReturnValue([]),
            getComputesByStatus: jest.fn().mockReturnValue([]),
            getActiveArtifact: jest.fn(),
            saveActiveArtifact: jest.fn(),
            clearActiveArtifact: jest.fn()
        }

        mockPluginService = {
            updateRunStatus: jest.fn(),
            getComputationMetadata: jest.fn(),
            setComputeState: jest.fn(),
            getComputationRunState: jest.fn(),
            collapsePluginCatalog: jest.fn(),
            getPluginDetails: jest.fn().mockReturnValue(
                of({
                    plugin_id: 'test_plugin',
                    plugin_version: '1.0.0'
                })
            ),
            syncTasks$: new BehaviorSubject<void>(undefined),
            getPluginRuns: jest.fn().mockReturnValue(pluginRuns$.asObservable())
        }

        mockArtifactService = {
            getImage: jest.fn(),
            vector: new BehaviorSubject(null),
            raster: new BehaviorSubject(null)
        }
        mockMapService = {
            initMap: jest.fn()
        }

        await TestBed.configureTestingModule({
            imports: [
                ComputationsIndexComponent,
                NoopAnimationsModule,
                HttpClientModule,
                TranslocoTestingModule.forRoot({ langs: { en: {}, de: {} }, translocoConfig: { defaultLang: 'en' } })
            ],
            providers: [
                { provide: PluginService, useValue: mockPluginService },
                { provide: StorageService, useValue: mockStorageService },
                { provide: ArtifactService, useValue: mockArtifactService },
                { provide: MapService, useValue: mockMapService },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            params: {
                                name: 'test_plugin'
                            }
                        },
                        queryParams: of({})
                    }
                },
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
        if (fixture) {
            expect(fixture.debugElement.queryAll(By.css('.computations-index')).length).toBe(1)
            tick()
            discardPeriodicTasks()
            flush()
        }
    }))

    it('should render content for non-expandable computations correctly', fakeAsync(() => {
        mockStorageService.getComputesByStatus = jest.fn().mockReturnValue([
            {
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                pluginId: 'test_plugin',
                pluginName: 'Test Plugin',
                status: 'SUCCESS',
                request_ts: new Date('2023-09-27T16:42:52+01:00')
            }
        ] as ComputationDisplayEntity[])

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of()
            }
            return of()
        })

        component.ngOnInit()
        fixture.detectChanges()

        const metaElements = fixture.debugElement.queryAll(By.css('.card-subtitle.m-0'))
        expect(metaElements.length).toBeGreaterThan(0)

        discardPeriodicTasks()
    }))

    it('should display only primary children initially', fakeAsync(() => {
        mockStorageService.getComputesByStatus = jest.fn().mockReturnValue([
            {
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                pluginId: 'test_plugin',
                pluginName: 'Test Plugin',
                status: 'SUCCESS',
                request_ts: new Date('2023-09-27T16:42:52+01:00')
            }
        ] as ComputationDisplayEntity[])

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of({
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    request_ts: new Date('2023-09-27T16:42:52+01:00'),
                    params: {},
                    aoi: {} as ComputationMetadata['aoi'],
                    plugin_info: {
                        id: 'test_plugin',
                        version: '1.0.0'
                    },
                    artifacts: [
                        {
                            name: 'Image 1',
                            modality: 'IMAGE',
                            summary: 'An image 1.',
                            description: 'The image 1 is under CC0 license.',
                            filename: 'image1',
                            primary: true,
                            rank: 1,
                            sources: [],
                            tags: [],
                            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                            attachments: {}
                        },
                        {
                            name: 'Image 2',
                            modality: 'IMAGE',
                            summary: 'An image 2.',
                            description: 'The image 2 is under CC0 license.',
                            filename: 'image2',
                            primary: false,
                            rank: 1,
                            sources: [],
                            tags: [],
                            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                            attachments: {}
                        }
                    ],
                    status: 'SUCCESS',
                    message: '',
                    artifact_errors: {}
                } as ComputationMetadata)
            }
            return of()
        })

        component.ngOnInit()
        fixture.detectChanges()

        component.dataChange.next([
            {
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                pluginId: 'test_plugin',
                pluginName: 'Test Plugin',
                status: 'SUCCESS',
                request_ts: new Date('2023-09-27T16:42:52+01:00'),
                params: {},
                artifacts: [
                    {
                        name: 'Image 1',
                        modality: 'IMAGE',
                        summary: 'An image 1.',
                        description: 'The image 1 is under CC0 license.',
                        filename: 'image1',
                        primary: true,
                        correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                        tags: [],
                        attachments: {},
                        rank: 1,
                        sources: []
                    },
                    {
                        name: 'Image 2',
                        modality: 'IMAGE',

                        summary: 'An image 2.',
                        description: 'The image 2 is under CC0 license.',
                        filename: 'image2',
                        primary: false,
                        correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                        tags: [],
                        attachments: {},
                        rank: 2,
                        sources: []
                    }
                ],
                artifact_errors: {}
            }
        ])
        fixture.detectChanges()

        const parentComputation = fixture.debugElement.query(By.css('.parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()

        discardPeriodicTasks()
    }))

    it('should initialize tag filters and show them when artifacts have tags', fakeAsync(() => {
        component.ngOnInit()
        fixture.detectChanges()

        component.dataChange.next([
            {
                correlation_uuid: 'test-uuid',
                pluginId: 'test_plugin',
                pluginName: 'Test Plugin',
                status: 'SUCCESS',
                request_ts: new Date('2023-09-27T16:42:52+01:00'),
                artifacts: [
                    {
                        name: 'Analysis Result',
                        primary: true,
                        tags: ['analysis', 'data'],
                        modality: 'IMAGE',
                        correlation_uuid: 'test-uuid',
                        filename: 'image1',
                        attachments: {},
                        rank: 1,
                        sources: []
                    },
                    {
                        name: 'Primary No Tags',
                        primary: true,
                        tags: [],
                        modality: 'IMAGE',
                        correlation_uuid: 'test-uuid',
                        filename: 'image2',
                        attachments: {},
                        rank: 2,
                        sources: []
                    },
                    {
                        name: 'Visualization',
                        primary: false,
                        tags: ['visualization'],
                        modality: 'CHART',
                        correlation_uuid: 'test-uuid',
                        filename: 'image3',
                        attachments: {},
                        rank: 3,
                        sources: []
                    },
                    {
                        name: 'Raw Data',
                        primary: false,
                        tags: [],
                        modality: 'TABLE',
                        correlation_uuid: 'test-uuid',
                        filename: 'image4',
                        attachments: {},
                        rank: 4,
                        sources: []
                    }
                ],
                params: {},
                artifact_errors: {}
            }
        ])
        fixture.detectChanges()
        tick()

        const childComponents = fixture.debugElement.queryAll(By.directive(ComputationComponent))
        expect(childComponents.length).toBeGreaterThan(0)

        const computationComponent = childComponents[0].componentInstance as ComputationComponent

        expect(computationComponent.shouldShowFilters).toBe(true)
        expect(computationComponent.availableTags).toContain('analysis')
        expect(computationComponent.availableTags).toContain('visualization')
        expect(computationComponent.tagCounts.get('all')).toBe(4)
        expect(computationComponent.tagCounts.get('main')).toBe(2)
        expect(computationComponent.tagCounts.get('untagged')).toBe(1)

        computationComponent.selectTag('untagged')
        expect(computationComponent.filteredArtifacts.length).toBe(1)
        expect(computationComponent.filteredArtifacts[0].name).toBe('Raw Data')
        expect(computationComponent.filteredArtifacts[0].primary).toBe(false)

        discardPeriodicTasks()
    }))

    it('should filter artifacts by selected tag', fakeAsync(() => {
        component.ngOnInit()
        fixture.detectChanges()

        component.dataChange.next([
            {
                correlation_uuid: 'test-uuid',
                pluginId: 'test_plugin',
                pluginName: 'Test Plugin',
                status: 'SUCCESS',
                request_ts: new Date('2023-09-27T16:42:52+01:00'),
                artifacts: [
                    {
                        name: 'Primary Analysis',
                        primary: true,
                        tags: ['analysis'],
                        modality: 'IMAGE',
                        correlation_uuid: 'test-uuid',
                        filename: 'image1',
                        attachments: {},
                        rank: 1,
                        sources: []
                    },
                    {
                        name: 'Secondary Chart',
                        primary: false,
                        tags: ['visualization'],
                        modality: 'CHART',
                        correlation_uuid: 'test-uuid',
                        filename: 'image2',
                        attachments: {},
                        rank: 2,
                        sources: []
                    }
                ],
                params: {},
                artifact_errors: {}
            }
        ])
        fixture.detectChanges()
        tick()

        const childComponents = fixture.debugElement.queryAll(By.directive(ComputationComponent))
        expect(childComponents.length).toBeGreaterThan(0)

        const computationComponent = childComponents[0].componentInstance as ComputationComponent

        computationComponent.selectTag('main')
        expect(computationComponent.filteredArtifacts.length).toBe(1)
        expect(computationComponent.filteredArtifacts[0].primary).toBe(true)

        computationComponent.selectTag('visualization')
        expect(computationComponent.filteredArtifacts.length).toBe(1)
        expect(computationComponent.filteredArtifacts[0].name).toBe('Secondary Chart')

        discardPeriodicTasks()
    }))

    it('should not show filters when all artifacts are untagged and same type', fakeAsync(() => {
        component.ngOnInit()
        fixture.detectChanges()

        component.dataChange.next([
            {
                correlation_uuid: 'test-uuid',
                pluginId: 'test_plugin',
                pluginName: 'Test Plugin',
                status: 'SUCCESS',
                request_ts: new Date('2023-09-27T16:42:52+01:00'),
                artifacts: [
                    {
                        name: 'Result 1',
                        primary: true,
                        tags: [],
                        modality: 'IMAGE',
                        correlation_uuid: 'test-uuid',
                        filename: 'image1',
                        attachments: {},
                        rank: 1,
                        sources: []
                    },
                    {
                        name: 'Result 2',
                        primary: true,
                        tags: [],
                        modality: 'IMAGE',
                        correlation_uuid: 'test-uuid',
                        filename: 'image2',
                        attachments: {},
                        rank: 2,
                        sources: []
                    }
                ],
                params: {},
                artifact_errors: {}
            }
        ])
        fixture.detectChanges()
        tick()

        const childComponents = fixture.debugElement.queryAll(By.directive(ComputationComponent))
        expect(childComponents.length).toBeGreaterThan(0)

        const computationComponent = childComponents[0].componentInstance as ComputationComponent

        expect(computationComponent.shouldShowFilters).toBe(false)

        discardPeriodicTasks()
    }))

    it('should create a link and trigger a download when downloadContent is called', fakeAsync(() => {
        const computationFixture = TestBed.createComponent(ComputationComponent)
        const computationComponent = computationFixture.componentInstance

        const testArtifact = {
            name: 'Test Image',
            modality: 'IMAGE',
            correlation_uuid: 'test-uuid',
            filename: 'sample-image',
            primary: true,
            tags: [],
            attachments: {},
            rank: 1,
            sources: []
        }

        const fakeAnchor = document.createElement('a')
        jest.spyOn(fakeAnchor, 'click').mockImplementation(() => {})
        const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(fakeAnchor)
        const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(computation => computation)
        const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(computation => computation)

        computationComponent.downloadContent(testArtifact as ArtifactEntity)

        expect(createElementSpy).toHaveBeenCalled()
        expect(createElementSpy).toHaveBeenCalledWith('a')
        expect(fakeAnchor.href).toContain('/store/test-uuid/sample-image')
        expect(fakeAnchor.download).toBeTruthy()
        expect(fakeAnchor.click).toHaveBeenCalled()
        expect(appendChildSpy).toHaveBeenCalled()
        expect(removeChildSpy).toHaveBeenCalled()

        discardPeriodicTasks()
    }))
})
