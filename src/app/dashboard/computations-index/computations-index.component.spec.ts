import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, of } from 'rxjs'
import { getTranslocoTestingModule, MockToastrService } from '../../../../jest.mocks'
import { StorageService } from '../../storage.service'
import { ArtifactService } from '../artifact/artifact.service'
import { MapSearchManagerService } from '../map/map-search-manager.service'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { ShareService } from '../share/share.service'
import { ComputationDatabaseEntity, ComputationDisplayEntity, SearchEntry, SearchPage } from './computation.interface'
import { ComputationsIndexComponent } from './computations-index.component'

const TEST_UUID = '8a897536-c4b4-4e5a-9d70-50430183ac66'

function flushPromises(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve))
}

function createTestRun(overrides: Partial<ComputationDatabaseEntity> = {}): ComputationDatabaseEntity {
    return {
        correlation_uuid: TEST_UUID,
        pluginId: 'test_plugin',
        aoiName: 'Test AOI',
        status: 'SUCCESS',
        request_ts: new Date('2023-09-27T16:42:52+01:00'),
        ...overrides
    }
}

function createSearchPage(items: SearchEntry[], nextPage: string | null = null): SearchPage {
    return {
        items,
        current_page: null,
        current_page_backwards: null,
        previous_page: null,
        next_page: nextPage
    }
}

describe('ComputationsIndexComponent', () => {
    let component: ComputationsIndexComponent
    let fixture: ComponentFixture<ComputationsIndexComponent>

    let mockPluginService: Partial<PluginService>
    let mockStorageService: Partial<StorageService>
    let mockArtifactService: Partial<ArtifactService>
    let mockMapService: Partial<MapService>
    let mockmapSearchManager: Partial<MapSearchManagerService>
    let mockShareService: Partial<ShareService>
    let router: Router
    let translocoService: TranslocoService
    let toastrService: ToastrService

    let pluginRuns$: BehaviorSubject<ComputationDatabaseEntity[]>

    function seedStoredRuns(runs: ComputationDatabaseEntity[]): void {
        mockStorageService.getComputesByStatus = jest.fn().mockReturnValue(runs)
        pluginRuns$.next(runs)
        fixture.detectChanges()
    }

    beforeEach(async () => {
        pluginRuns$ = new BehaviorSubject<ComputationDatabaseEntity[]>([])

        mockStorageService = {
            getPluginRunsObservable: jest.fn().mockReturnValue(pluginRuns$.asObservable()),
            getPluginRunsPaginated: jest.fn().mockResolvedValue({
                documents: [],
                hasMore: false
            }),
            getComputesByStatus: jest.fn().mockReturnValue([]),
            markAsNew: jest.fn(),
            markAsViewed: jest.fn(),
            deleteComputation: jest.fn(() => Promise.resolve()),
            getActiveTab: jest.fn().mockReturnValue('bookmarks'),
            saveActiveTab: jest.fn()
        }

        mockPluginService = {
            updateRunStatus: jest.fn(),
            getComputationMetadata: jest.fn(),
            setComputeState: jest.fn(),
            getComputationRunState: jest.fn().mockReturnValue(of({ state: 'PENDING' })),
            collapsePluginCatalog: jest.fn(),
            getPluginNameById: jest.fn((id: string) => id),
            getSearch: jest.fn().mockReturnValue(of(createSearchPage([]))),
            getSearchCentroids: jest.fn().mockReturnValue(of({ type: 'FeatureCollection', features: [] })),
            getPluginRuns: jest.fn().mockReturnValue(pluginRuns$.asObservable()),
            storeNewComputes: jest.fn(() => Promise.resolve())
        }

        mockArtifactService = {
            getImage: jest.fn(),
            resetAllSubjects: jest.fn(),
            vector: new BehaviorSubject(null),
            raster: new BehaviorSubject(null)
        }
        mockMapService = {
            initMap: jest.fn(() => Promise.resolve()),
            highlightAoI: jest.fn().mockReturnValue([0, 0, 1, 1]),
            removeFocusedLayer: jest.fn(),
            flyToExtent: jest.fn()
        }
        mockmapSearchManager = {
            showSearchLayers: jest.fn(),
            hideSearchLayers: jest.fn(),
            clearSearchLayers: jest.fn()
        }
        mockShareService = {
            copyShareLink: jest.fn()
        }

        await TestBed.configureTestingModule({
            imports: [
                ComputationsIndexComponent,
                HttpClientTestingModule,
                NoopAnimationsModule,
                RouterModule.forRoot([]),
                getTranslocoTestingModule()
            ],
            providers: [
                { provide: PluginService, useValue: mockPluginService },
                { provide: StorageService, useValue: mockStorageService },
                { provide: ArtifactService, useValue: mockArtifactService },
                { provide: MapService, useValue: mockMapService },
                { provide: MapSearchManagerService, useValue: mockmapSearchManager },
                { provide: ToastrService, useClass: MockToastrService },
                { provide: ShareService, useValue: mockShareService },
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

        translocoService = TestBed.inject(TranslocoService)
        toastrService = TestBed.inject(ToastrService)
        router = TestBed.inject(Router)
    })

    beforeEach(async () => {
        fixture = TestBed.createComponent(ComputationsIndexComponent)
        component = fixture.componentInstance
        translocoService.setActiveLang('en')

        component.formatTimestamp = jest.fn().mockReturnValue('1 Jan 2023, 12:00 PM')

        fixture.detectChanges()
        await flushPromises()
        fixture.detectChanges()
    })

    afterEach(() => {
        expect(fixture.debugElement.queryAll(By.css('.computations-index')).length).toBe(1)
    })

    it('given no runs should create an empty computation index view', () => {
        expect(component).toBeTruthy()
        expect(component.activeTab).toBe('bookmarks')
        expect(mockPluginService.updateRunStatus).not.toHaveBeenCalled()

        expect(fixture.debugElement.queryAll(By.css('.parent-computation')).length).toBe(0)
        expect(fixture.debugElement.query(By.css('.empty-computations'))).toBeTruthy()
    })

    it('should render a completed run as a clickable row', () => {
        seedStoredRuns([createTestRun()])

        const row = fixture.debugElement.query(By.css('.parent-computation'))
        expect(row).toBeTruthy()
        expect(row.nativeElement.textContent).toContain('Test AOI')
    })

    it('clicking a row should navigate to the computation detail', () => {
        const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true)
        seedStoredRuns([createTestRun()])

        fixture.debugElement.query(By.css('.parent-computation')).triggerEventHandler('click', null)

        expect(navigateSpy).toHaveBeenCalledWith(['computation', TEST_UUID], { relativeTo: expect.anything() })
    })

    it('should derive the NEW badge from run flags', () => {
        seedStoredRuns([createTestRun({ flags: ['NEW'] })])

        expect(fixture.debugElement.query(By.css('.parent-computation.is-new'))).toBeTruthy()

        component.runs.set([])
        seedStoredRuns([createTestRun({ flags: [] })])

        expect(fixture.debugElement.query(By.css('.parent-computation.is-new'))).toBeFalsy()
    })

    it('should drop runs that were removed from storage (e.g. un-bookmarked in the detail view)', async () => {
        seedStoredRuns([createTestRun()])
        expect(component.runs()).toHaveLength(1)

        mockStorageService.getComputesByStatus = jest.fn().mockReturnValue([])
        pluginRuns$.next([])
        await flushPromises()

        expect(component.runs()).toHaveLength(0)
    })

    it('should load and display the search results when switching to the discover tab', () => {
        const entry: SearchEntry = {
            correlation_uuid: 'dir-1',
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
            plugin_id: 'test_plugin',
            aoi_name: 'Test AoI'
        }
        mockPluginService.getSearch = jest.fn().mockReturnValue(of(createSearchPage([entry])))

        component.switchTab('discover')
        fixture.detectChanges()

        expect(mockStorageService.saveActiveTab).toHaveBeenCalledWith('discover')
        expect(mockPluginService.getSearch).toHaveBeenCalledWith('test_plugin', null, 10)
        expect(component.searchComputations().length).toBe(1)
        expect(component.searchComputations()[0]).toEqual(
            expect.objectContaining({
                correlation_uuid: 'dir-1',
                aoiName: 'Test AoI',
                status: 'SUCCESS',
                hydrated: false
            })
        )
        expect(fixture.debugElement.queryAll(By.css('.parent-computation')).length).toBe(1)

        expect(mockPluginService.getSearchCentroids).toHaveBeenCalledWith('test_plugin')
        expect(mockmapSearchManager.showSearchLayers).toHaveBeenCalled()
    })

    it('should bookmark a computation and add it to the runs list', async () => {
        const computation = {
            correlation_uuid: 'dir-1',
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
            aoiName: 'Test AoI',
            pluginId: 'test_plugin',
            status: 'SUCCESS',
            artifacts: []
        } as ComputationDisplayEntity

        component.toggleBookmark(computation, new Event('click'))
        await flushPromises()

        expect(mockPluginService.storeNewComputes).toHaveBeenCalledWith(
            expect.objectContaining({
                correlation_uuid: 'dir-1',
                status: 'SUCCESS',
                aoiName: 'Test AoI'
            })
        )
        expect(component.isBookmarked('dir-1')).toBe(true)
        expect(toastrService.success).toHaveBeenCalled()
    })

    it('should remove a bookmark and drop the run from the list', async () => {
        seedStoredRuns([createTestRun()])
        expect(component.isBookmarked(TEST_UUID)).toBe(true)

        const computation = {
            correlation_uuid: TEST_UUID,
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
            status: 'SUCCESS',
            artifacts: []
        } as ComputationDisplayEntity

        component.toggleBookmark(computation, new Event('click'))
        await flushPromises()

        expect(mockStorageService.deleteComputation).toHaveBeenCalledWith(TEST_UUID)
        expect(component.isBookmarked(TEST_UUID)).toBe(false)
    })

    it('should copy the computation share link for the current plugin', () => {
        const computation = { correlation_uuid: TEST_UUID } as ComputationDisplayEntity

        component.copyShareLink(computation, new Event('click'))

        expect(mockShareService.copyShareLink).toHaveBeenCalledWith('test_plugin', TEST_UUID)
    })

    it('should refetch the Discover list when a run succeeds while the tab is active', () => {
        component.switchTab('discover')
        fixture.detectChanges()
        expect(mockPluginService.getSearch).toHaveBeenCalledTimes(1)
        expect(mockPluginService.getSearchCentroids).toHaveBeenCalledTimes(1)

        component['transitionRunStatus']({ run: createTestRun({ status: 'PENDING' }), newStatus: 'SUCCESS' })

        expect(mockPluginService.getSearch).toHaveBeenCalledTimes(2)
        expect(mockPluginService.getSearchCentroids).toHaveBeenCalledTimes(2)
    })
})
