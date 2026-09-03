import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { ActivatedRoute } from '@angular/router'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, of, Subject } from 'rxjs'
import { getTranslocoTestingModule, MockToastrService } from '../../../../jest.mocks'
import { StorageService } from '../../storage.service'
import { ArtifactEntity } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationDatabaseEntity, ComputationDisplayEntity } from '../computations-index/computation.interface'
import { ComputationsIndexComponent } from '../computations-index/computations-index.component'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { StoreService } from '../store/store.service'
import { ComputationComponent } from './computation.component'

const TEST_UUID = '8a897536-c4b4-4e5a-9d70-50430183ac66'

function createArtifactEntity(overrides: Partial<ArtifactEntity> = {}): ArtifactEntity {
    return {
        name: 'Artifact',
        modality: 'IMAGE',
        primary: true,
        tags: [],
        correlation_uuid: TEST_UUID,
        filename: 'artifact-file',
        sources: [],
        attachments: {},
        rank: 1,
        ...overrides
    }
}

function createComputation(artifacts: ArtifactEntity[]): ComputationDisplayEntity {
    return {
        correlation_uuid: TEST_UUID,
        request_ts: new Date('2023-09-27T16:42:52+01:00'),
        status: 'SUCCESS',
        pluginId: 'test_plugin',
        aoiName: 'Test AOI',
        params: {},
        artifact_errors: {},
        artifacts,
        hydrated: true,
        isExpanded: true
    }
}

describe('ComputationComponent', () => {
    let component: ComputationsIndexComponent
    let fixture: ComponentFixture<ComputationsIndexComponent>

    let mockPluginService: Partial<PluginService>
    let mockStorageService: Partial<StorageService>
    let mockArtifactService: Partial<ArtifactService>
    let mockMapService: Partial<MapService>
    let mockStoreService: Partial<StoreService>

    let pluginRuns$: BehaviorSubject<ComputationDatabaseEntity[]>
    let syncTasks$: Subject<void>

    function createComputationComponent(artifacts: ArtifactEntity[]): ComputationComponent {
        const computationFixture = TestBed.createComponent(ComputationComponent)
        computationFixture.componentInstance.computation = createComputation(artifacts)
        computationFixture.detectChanges()
        return computationFixture.componentInstance
    }

    beforeEach(async () => {
        pluginRuns$ = new BehaviorSubject<ComputationDatabaseEntity[]>([])
        syncTasks$ = new Subject<void>()

        mockStorageService = {
            getPluginRunsObservable: jest.fn().mockReturnValue(pluginRuns$.asObservable()),
            getPluginRunsPaginated: jest.fn().mockResolvedValue({
                documents: [],
                total: 0,
                hasMore: false
            }),
            getNewRuns: jest.fn().mockReturnValue([]),
            getComputesByStatus: jest.fn().mockReturnValue([]),
            markAsNew: jest.fn(),
            markAsViewed: jest.fn(),
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
            getPluginNameById: jest.fn((id: string) => id),
            getPluginDetails: jest.fn().mockReturnValue(
                of({
                    plugin_id: 'test_plugin',
                    plugin_version: '1.0.0'
                })
            ),
            storeNewComputes: jest.fn(() => Promise.resolve()),
            syncTasks$,
            getPluginRuns: jest.fn().mockReturnValue(pluginRuns$.asObservable())
        }

        mockArtifactService = {
            getImage: jest.fn(),
            vector: new BehaviorSubject(null),
            raster: new BehaviorSubject(null)
        }
        mockMapService = {
            initMap: jest.fn(),
            highlightAoI: jest.fn().mockReturnValue([0, 0, 1, 1]),
            removeFocusedLayer: jest.fn(),
            flyToExtent: jest.fn()
        }
        mockStoreService = {
            getArtifactS3Url: jest.fn((correlationUuid: string, filename: string) =>
                of(`https://storage.example.com/${correlationUuid}/${filename}?X-Amz-Signature=abc`)
            )
        }

        await TestBed.configureTestingModule({
            imports: [ComputationsIndexComponent, NoopAnimationsModule, HttpClientModule, getTranslocoTestingModule()],
            providers: [
                { provide: PluginService, useValue: mockPluginService },
                { provide: StorageService, useValue: mockStorageService },
                { provide: ArtifactService, useValue: mockArtifactService },
                { provide: MapService, useValue: mockMapService },
                { provide: StoreService, useValue: mockStoreService },
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
                correlation_uuid: TEST_UUID,
                pluginId: 'test_plugin',
                aoiName: 'Test AOI',
                status: 'SUCCESS',
                request_ts: new Date('2023-09-27T16:42:52+01:00')
            }
        ] as ComputationDatabaseEntity[])

        pluginRuns$.next([])
        fixture.detectChanges()

        const metaElements = fixture.debugElement.queryAll(By.css('.card-subtitle'))
        expect(metaElements.length).toBeGreaterThan(0)

        discardPeriodicTasks()
    }))

    it('should display only primary children initially', fakeAsync(() => {
        const computationComponent = createComputationComponent([
            createArtifactEntity({ name: 'Image 1', primary: true }),
            createArtifactEntity({ name: 'Image 2', primary: false, filename: 'image2' })
        ])

        expect(computationComponent.filteredArtifacts.length).toBe(1)
        expect(computationComponent.filteredArtifacts[0].primary).toBe(true)

        discardPeriodicTasks()
    }))

    it('should initialize tag filters and show them when artifacts have tags', fakeAsync(() => {
        const computationComponent = createComputationComponent([
            createArtifactEntity({ name: 'Analysis Result', primary: true, tags: ['analysis', 'data'] }),
            createArtifactEntity({ name: 'Primary No Tags', primary: true, tags: [], filename: 'image2' }),
            createArtifactEntity({
                name: 'Visualization',
                primary: false,
                tags: ['visualization'],
                modality: 'CHART',
                filename: 'image3'
            }),
            createArtifactEntity({ name: 'Raw Data', primary: false, tags: [], modality: 'TABLE', filename: 'image4' })
        ])

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
        const computationComponent = createComputationComponent([
            createArtifactEntity({ name: 'Primary Analysis', primary: true, tags: ['analysis'] }),
            createArtifactEntity({
                name: 'Secondary Chart',
                primary: false,
                tags: ['visualization'],
                modality: 'CHART',
                filename: 'image2'
            })
        ])

        computationComponent.selectTag('main')
        expect(computationComponent.filteredArtifacts.length).toBe(1)
        expect(computationComponent.filteredArtifacts[0].primary).toBe(true)

        computationComponent.selectTag('visualization')
        expect(computationComponent.filteredArtifacts.length).toBe(1)
        expect(computationComponent.filteredArtifacts[0].name).toBe('Secondary Chart')

        discardPeriodicTasks()
    }))

    it('should not show filters when all artifacts are untagged and same type', fakeAsync(() => {
        const computationComponent = createComputationComponent([
            createArtifactEntity({ name: 'Result 1', primary: true, tags: [] }),
            createArtifactEntity({ name: 'Result 2', primary: true, tags: [], filename: 'image2' })
        ])

        expect(computationComponent.shouldShowFilters).toBe(false)

        discardPeriodicTasks()
    }))

    it('should create a link and trigger a download when downloadContent is called', fakeAsync(() => {
        const computationFixture = TestBed.createComponent(ComputationComponent)
        const computationComponent = computationFixture.componentInstance

        const testArtifact = createArtifactEntity({
            name: 'Test Image',
            correlation_uuid: 'test-uuid',
            filename: 'sample-image'
        })

        const fakeAnchor = document.createElement('a')
        jest.spyOn(fakeAnchor, 'click').mockImplementation(() => {})
        const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(fakeAnchor)
        const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(computation => computation)
        const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(computation => computation)

        computationComponent.downloadContent(testArtifact)

        expect(mockStoreService.getArtifactS3Url).toHaveBeenCalledWith('test-uuid', 'sample-image')
        expect(createElementSpy).toHaveBeenCalled()
        expect(createElementSpy).toHaveBeenCalledWith('a')
        expect(fakeAnchor.href).toContain('storage.example.com/test-uuid/sample-image')
        expect(fakeAnchor.download).toBeTruthy()
        expect(fakeAnchor.click).toHaveBeenCalled()
        expect(appendChildSpy).toHaveBeenCalled()
        expect(removeChildSpy).toHaveBeenCalled()

        discardPeriodicTasks()
    }))
})
