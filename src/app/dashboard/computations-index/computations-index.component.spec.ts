import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, of, throwError } from 'rxjs'
import { getTranslocoTestingModule, MockToastrService } from '../../../../jest.mocks'
import { StorageService } from '../../storage.service'
import { SupportedLanguage } from '../../types/language.types'
import { ArtifactService } from '../artifact/artifact.service'
import { MapSearchManagerService } from '../map/map-search-manager.service'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import {
    ComputationDatabaseEntity,
    ComputationDisplayEntity,
    ComputationMetadata,
    SearchEntry,
    SearchPage
} from './computation.interface'
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

function createMetadata(overrides: Partial<ComputationMetadata> = {}): ComputationMetadata {
    return {
        correlation_uuid: TEST_UUID,
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
                tags: [],
                summary: 'An image.',
                description: 'The image is under CC0 license.',
                correlation_uuid: TEST_UUID,
                filename: '09c8eabf-4b73-452c-b3bc-47310a91eaa7_blueprint_image.png',
                sources: [],
                attachments: {},
                rank: 1
            }
        ],
        plugin_info: {
            id: 'test_plugin',
            version: '1.0.0'
        },
        status: 'SUCCESS',
        message: '',
        artifact_errors: {},
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
    let mockMatDialog: { open: jest.Mock; closeAll: jest.Mock }
    let translocoService: TranslocoService
    let toastrService: ToastrService

    let pluginRuns$: BehaviorSubject<ComputationDatabaseEntity[]>

    function seedStoredRuns(runs: ComputationDatabaseEntity[]): void {
        mockStorageService.getComputesByStatus = jest.fn().mockReturnValue(runs)
        pluginRuns$.next(runs)
        fixture.detectChanges()
    }

    async function expandFirstComputation(): Promise<void> {
        const parentComputation = fixture.debugElement.query(By.css('.parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        await flushPromises()
        fixture.detectChanges()
        await flushPromises()
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
            getNewRuns: jest.fn().mockReturnValue([]),
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
            initMap: jest.fn(),
            highlightAoI: jest.fn().mockReturnValue([0, 0, 1, 1]),
            removeFocusedLayer: jest.fn(),
            flyToExtent: jest.fn()
        }
        mockmapSearchManager = {
            showSearchLayers: jest.fn(),
            hideSearchLayers: jest.fn(),
            clearSearchLayers: jest.fn()
        }
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
                getTranslocoTestingModule()
            ],
            providers: [
                { provide: PluginService, useValue: mockPluginService },
                { provide: StorageService, useValue: mockStorageService },
                { provide: ArtifactService, useValue: mockArtifactService },
                { provide: MapService, useValue: mockMapService },
                { provide: MapSearchManagerService, useValue: mockmapSearchManager },
                { provide: MatDialog, useValue: mockMatDialog },
                { provide: ToastrService, useClass: MockToastrService },
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
        expect(fixture.debugElement.queryAll(By.css('.child-computation')).length).toBe(0)
        expect(fixture.debugElement.query(By.css('.empty-computations'))).toBeTruthy()
    })

    it('given a completed run should hydrate and expand the computation on click', async () => {
        seedStoredRuns([createTestRun()])
        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(of(createMetadata()))

        await expandFirstComputation()

        expect(mockPluginService.getComputationMetadata).toHaveBeenCalledWith(TEST_UUID)
        expect(component.runs()[0].hydrated).toBe(true)
        expect(fixture.debugElement.queryAll(By.css('.child-computation')).length).toBe(1)
        expect(mockMapService.highlightAoI).toHaveBeenCalled()
        expect(mockMapService.flyToExtent).toHaveBeenCalled()
    })

    it('should surface a toast and stay collapsed when hydration fails', async () => {
        seedStoredRuns([createTestRun()])
        mockPluginService.getComputationMetadata = jest
            .fn()
            .mockReturnValue(throwError(() => new Error('fetch failed')))

        await expandFirstComputation()

        expect(component.activeComputation).toBeUndefined()
        expect(toastrService.error).toHaveBeenCalled()
        expect(fixture.debugElement.queryAll(By.css('.child-computation')).length).toBe(0)
    })

    it('should display artifact errors next to the computation', async () => {
        seedStoredRuns([createTestRun()])
        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(
            of(
                createMetadata({
                    artifact_errors: {
                        'Failing Indicator': 'Error message'
                    }
                })
            )
        )

        await expandFirstComputation()

        const artifactErrorsIcon = fixture.debugElement.query(By.css('.artifact-errors'))
        expect(artifactErrorsIcon).toBeTruthy()
    })

    it('should display a language mismatch icon when computation language differs from active language', async () => {
        seedStoredRuns([createTestRun()])
        mockPluginService.getComputationMetadata = jest
            .fn()
            .mockReturnValue(of(createMetadata({ language: SupportedLanguage.DE })))

        await expandFirstComputation()

        const languageMismatchIcon = fixture.debugElement.query(By.css('.language-mismatch'))
        expect(languageMismatchIcon).toBeTruthy()
    })

    it('should not display a language mismatch icon when computation language matches active language', async () => {
        seedStoredRuns([createTestRun()])
        mockPluginService.getComputationMetadata = jest
            .fn()
            .mockReturnValue(of(createMetadata({ language: SupportedLanguage.EN })))

        await expandFirstComputation()

        const languageMismatchIcon = fixture.debugElement.query(By.css('.language-mismatch'))
        expect(languageMismatchIcon).toBeFalsy()
    })

    it('should treat missing computation language as english and display a mismatch icon', async () => {
        translocoService.setActiveLang(SupportedLanguage.DE)

        seedStoredRuns([createTestRun()])
        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(of(createMetadata()))

        await expandFirstComputation()

        const languageMismatchIcon = fixture.debugElement.query(By.css('.language-mismatch'))
        expect(languageMismatchIcon).toBeTruthy()
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
        expect(fixture.debugElement.queryAll(By.css('.parent-computation')).length).toBe(1)
        expect(mockmapSearchManager.showSearchLayers).toHaveBeenCalled()
    })

    it('should hydrate a search computation on toggle and hide the search map layer', async () => {
        const entry: SearchEntry = {
            correlation_uuid: 'dir-1',
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
            plugin_id: 'test_plugin',
            aoi_name: 'Test AoI'
        }
        mockPluginService.getSearch = jest.fn().mockReturnValue(of(createSearchPage([entry])))
        mockPluginService.getComputationMetadata = jest
            .fn()
            .mockReturnValue(of(createMetadata({ correlation_uuid: 'dir-1' })))

        component.switchTab('discover')
        fixture.detectChanges()

        await expandFirstComputation()

        expect(mockPluginService.getComputationMetadata).toHaveBeenCalledWith('dir-1')
        expect(component.searchComputations()[0].hydrated).toBe(true)
        expect(mockmapSearchManager.hideSearchLayers).toHaveBeenCalled()
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

    it('should successfully import a new computation', async () => {
        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(
            of(
                createMetadata({
                    aoi: {
                        type: 'Feature',
                        geometry: {
                            type: 'MultiPolygon',
                            coordinates: []
                        },
                        properties: { name: 'Imported AOI' }
                    }
                })
            )
        )

        component.importComputation(TEST_UUID)
        await flushPromises()

        const expectedComputation = {
            correlation_uuid: TEST_UUID,
            pluginId: 'test_plugin',
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
            status: 'SUCCESS',
            aoiName: 'Imported AOI',
            flags: ['IMPORTED']
        }

        expect(mockPluginService.getComputationMetadata).toHaveBeenCalledWith(TEST_UUID)
        expect(mockPluginService.storeNewComputes).toHaveBeenCalledWith(expectedComputation)
        expect(component.runs()).toHaveLength(1)
        expect(component.runs()[0]).toEqual(expect.objectContaining(expectedComputation))
        expect(component.importedRuns).toContain(TEST_UUID)
    })

    it('should warn instead of importing an already bookmarked computation', () => {
        seedStoredRuns([createTestRun()])

        component.importComputation(TEST_UUID)

        expect(mockPluginService.storeNewComputes).not.toHaveBeenCalled()
        expect(toastrService.warning).toHaveBeenCalled()
    })

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
