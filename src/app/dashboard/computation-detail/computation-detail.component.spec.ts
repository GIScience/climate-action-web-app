import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { ActivatedRoute, convertToParamMap, Router, RouterModule } from '@angular/router'
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, of, Subject, throwError } from 'rxjs'
import { MockToastrService } from '../../../../jest.mocks'
import { StorageService } from '../../storage.service'
import { SupportedLanguage } from '../../types/language.types'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationParametersDialogComponent } from '../common/computation-parameters-dialog/computation-parameters-dialog.component'
import { MapArtifactManagerService } from '../map/map-artifact-manager.service'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { ShareService } from '../share/share.service'
import { ComputationDetailComponent } from './computation-detail.component'

const UUID = '8a897536-c4b4-4e5a-9d70-50430183ac66'

function flushPromises(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve))
}

function buildMetadata(pluginId: string = 'test_plugin') {
    return {
        correlation_uuid: UUID,
        request_ts: new Date('2023-09-27T16:42:52+01:00'),
        params: { foo: 'bar' },
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
            properties: { name: 'Test AOI' }
        },
        artifacts: [
            {
                name: 'Image',
                modality: 'IMAGE',
                primary: true,
                summary: 'An image.',
                description: '',
                correlation_uuid: UUID,
                filename: 'blueprint_image.png',
                attachments: {},
                sources: []
            }
        ],
        plugin_info: { id: pluginId, version: '1.0.0' },
        status: 'SUCCESS',
        message: '',
        artifact_errors: {}
    }
}

describe('ComputationDetailComponent', () => {
    let component: ComputationDetailComponent
    let fixture: ComponentFixture<ComputationDetailComponent>

    let mockPluginService: Partial<PluginService>
    let mockStorageService: Partial<StorageService>
    let mockMapService: Partial<MapService>
    let mockMapArtifactManager: Partial<MapArtifactManagerService>
    let mockArtifactViewerService: Partial<ArtifactViewerService>
    let mockArtifactService: Partial<ArtifactService>
    let mockShareService: Partial<ShareService>
    let mockMatDialog: { open: jest.Mock; closeAll: jest.Mock }
    let router: Router
    let navigateSpy: jest.SpyInstance
    let translocoService: TranslocoService

    let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>
    let snapshotStub: { queryParamMap: ReturnType<typeof convertToParamMap> }
    let routeStub: ActivatedRoute
    let pluginRuns$: BehaviorSubject<unknown[]>
    let viewerVisible$: BehaviorSubject<boolean>
    let mapArtifacts$: BehaviorSubject<unknown[]>

    beforeEach(async () => {
        paramMap$ = new BehaviorSubject(convertToParamMap({ uuid: UUID }))
        pluginRuns$ = new BehaviorSubject<unknown[]>([])
        viewerVisible$ = new BehaviorSubject<boolean>(false)
        mapArtifacts$ = new BehaviorSubject<unknown[]>([])

        snapshotStub = { queryParamMap: convertToParamMap({}) }
        routeStub = {
            paramMap: paramMap$.asObservable(),
            snapshot: snapshotStub,
            parent: { snapshot: { params: { name: 'test_plugin' } } }
        } as unknown as ActivatedRoute

        mockPluginService = {
            getComputationMetadata: jest.fn().mockReturnValue(of(buildMetadata())),
            setComputeState: jest.fn(),
            collapsePluginCatalog: jest.fn(),
            storeNewComputes: jest.fn(() => Promise.resolve()),
            getPluginNameById: jest.fn((id: string) => id),
            activePlugin$: new BehaviorSubject(null).asObservable()
        }

        mockStorageService = {
            getPluginRuns: jest.fn().mockReturnValue([]),
            getPluginRunsObservable: jest.fn().mockReturnValue(pluginRuns$.asObservable()),
            markAsViewed: jest.fn().mockResolvedValue(undefined),
            deleteComputation: jest.fn().mockResolvedValue(undefined)
        }

        mockMapService = {
            mapReady$: of(undefined),
            highlightAoI: jest.fn().mockReturnValue([0, 0, 1, 1]),
            flyToExtent: jest.fn(),
            removeFocusedLayer: jest.fn(),
            map: undefined
        }

        mockMapArtifactManager = {
            activeMapArtifacts$: mapArtifacts$.asObservable(),
            setActiveArtifactId: jest.fn(),
            clearTransientArtifacts: jest.fn(),
            setTransientArtifact: jest.fn().mockReturnValue(true),
            isMapArtifact: jest.fn().mockReturnValue(false),
            isArtifactPersisted: jest.fn().mockReturnValue(false),
            getActiveMapArtifacts: jest.fn().mockReturnValue([])
        } as Partial<MapArtifactManagerService>

        mockArtifactViewerService = {
            isViewerVisible$: viewerVisible$.asObservable(),
            closeArtifactViewer: jest.fn(),
            setName: jest.fn()
        } as Partial<ArtifactViewerService>

        mockArtifactService = {
            image: new BehaviorSubject(null),
            markdown: new BehaviorSubject(null),
            table: new BehaviorSubject(null),
            chart: new BehaviorSubject(null),
            plotlyChart: new BehaviorSubject(null),
            fetchArtifact: jest.fn(),
            clearLegend: jest.fn(),
            getLegend: jest.fn()
        } as unknown as Partial<ArtifactService>

        mockShareService = {
            copyShareLink: jest.fn()
        }

        mockMatDialog = { open: jest.fn(), closeAll: jest.fn() }

        await TestBed.configureTestingModule({
            imports: [
                ComputationDetailComponent,
                HttpClientTestingModule,
                NoopAnimationsModule,
                RouterModule.forRoot([]),
                TranslocoTestingModule.forRoot({ langs: { en: {}, de: {} }, translocoConfig: { defaultLang: 'en' } })
            ],
            providers: [
                { provide: ActivatedRoute, useValue: routeStub },
                { provide: PluginService, useValue: mockPluginService },
                { provide: StorageService, useValue: mockStorageService },
                { provide: MapService, useValue: mockMapService },
                { provide: MapArtifactManagerService, useValue: mockMapArtifactManager },
                { provide: ArtifactViewerService, useValue: mockArtifactViewerService },
                { provide: ArtifactService, useValue: mockArtifactService },
                { provide: ShareService, useValue: mockShareService },
                { provide: ToastrService, useClass: MockToastrService },
                { provide: MatDialog, useValue: mockMatDialog },
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
        router = TestBed.inject(Router)
        // The ActivatedRoute stub lacks router internals, so real navigation
        // (e.g. the ?artifact= query param sync) must never run in tests
        navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true)
    })

    function createComponent(): void {
        fixture = TestBed.createComponent(ComputationDetailComponent)
        component = fixture.componentInstance
        translocoService.setActiveLang('en')
        fixture.detectChanges()
    }

    afterEach(fakeAsync(() => {
        tick()
        discardPeriodicTasks()
        flush()
    }))

    it('should hydrate the computation from the route uuid and focus its AoI', fakeAsync(() => {
        createComponent()
        tick()
        fixture.detectChanges()

        expect(mockPluginService.getComputationMetadata).toHaveBeenCalledWith(UUID)
        expect(component.state).toBe('ready')
        expect(component.computation?.aoiName).toBe('Test AOI')
        expect(component.computation?.isExpanded).toBe(true)
        expect(mockMapService.highlightAoI).toHaveBeenCalled()
        expect(mockMapService.flyToExtent).toHaveBeenCalledWith([0, 0, 1, 1])
        expect(mockStorageService.markAsViewed).toHaveBeenCalledWith(UUID)

        expect(fixture.debugElement.query(By.css('app-computation'))).toBeTruthy()
        expect(fixture.debugElement.queryAll(By.css('.child-computation')).length).toBe(1)
    }))

    it('should defer the AoI focus until the map is ready', fakeAsync(() => {
        const mapReady$ = new Subject<void>()
        mockMapService.mapReady$ = mapReady$.asObservable()

        createComponent()
        tick()

        expect(component.state).toBe('ready')
        expect(mockMapService.highlightAoI).not.toHaveBeenCalled()

        mapReady$.next()

        expect(mockMapService.highlightAoI).toHaveBeenCalled()
        expect(mockMapService.flyToExtent).toHaveBeenCalledWith([0, 0, 1, 1])
    }))

    it('should show the not-found panel when the metadata fetch 404s', fakeAsync(() => {
        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(throwError(() => ({ status: 404 })))

        createComponent()
        tick()
        fixture.detectChanges()

        expect(component.state).toBe('not-found')
        expect(fixture.debugElement.query(By.css('.detail-message'))).toBeTruthy()
        expect(fixture.debugElement.query(By.css('app-computation'))).toBeFalsy()
    }))

    it('should show a retryable error panel on other failures', fakeAsync(() => {
        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(throwError(() => ({ status: 500 })))

        createComponent()
        tick()
        fixture.detectChanges()

        expect(component.state).toBe('error')

        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(of(buildMetadata()))

        component.retry()
        tick()

        expect(component.state).toBe('ready')
    }))

    it('should redirect to the owning plugin when the URL names the wrong one', fakeAsync(() => {
        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(of(buildMetadata('other_plugin')))

        createComponent()
        tick()

        expect(navigateSpy).toHaveBeenCalledWith(
            ['/dashboard/plugin', 'other_plugin', 'computation', UUID],
            expect.objectContaining({ replaceUrl: true, queryParamsHandling: 'preserve' })
        )
        expect(component.state).toBe('loading')
    }))

    it('should auto-open the artifact named in the query param', fakeAsync(() => {
        snapshotStub.queryParamMap = convertToParamMap({ artifact: 'blueprint_image.png' })

        createComponent()
        tick()
        fixture.detectChanges()

        expect(component.activeArtifact?.filename).toBe('blueprint_image.png')
    }))

    it('should warn about and strip an unknown ?artifact= param instead of opening anything', fakeAsync(() => {
        snapshotStub.queryParamMap = convertToParamMap({ artifact: 'missing.png' })
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

        createComponent()
        tick()

        expect(component.activeArtifact).toBeUndefined()
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing.png'))
        expect(navigateSpy).toHaveBeenCalledWith(
            [],
            expect.objectContaining({ queryParams: { artifact: null }, queryParamsHandling: 'merge', replaceUrl: true })
        )
    }))

    it('should clear the active artifact and its URL param when the viewer closes', fakeAsync(() => {
        snapshotStub.queryParamMap = convertToParamMap({ artifact: 'blueprint_image.png' })

        createComponent()
        tick()
        expect(component.activeArtifact?.filename).toBe('blueprint_image.png')
        navigateSpy.mockClear()

        viewerVisible$.next(false)

        expect(component.activeArtifact).toBeUndefined()
        expect(mockMapArtifactManager.setActiveArtifactId).toHaveBeenLastCalledWith(null)
        expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { artifact: null } }))
    }))

    it('should write the default tag to the URL on load, then merge user selections and share them', async () => {
        const metadata = buildMetadata()
        metadata.artifacts.push({ ...metadata.artifacts[0], name: 'Chart', filename: 'chart.png', primary: false })
        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(of(metadata))

        createComponent()
        await flushPromises()
        fixture.detectChanges()

        expect(component.selectedTag).toBe('main')
        expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { tag: 'main' } }))
        navigateSpy.mockClear()

        component.onSelectedTagChange('visualization')

        expect(navigateSpy).toHaveBeenCalledWith(
            [],
            expect.objectContaining({
                queryParams: { tag: 'visualization' },
                queryParamsHandling: 'merge',
                replaceUrl: true
            })
        )

        component.copyShareLink()
        expect(mockShareService.copyShareLink).toHaveBeenCalledWith('test_plugin', UUID, undefined, 'visualization')
    })

    it('should display the artifact errors icon when the computation has artifact errors', fakeAsync(() => {
        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(
            of({
                ...buildMetadata(),
                artifact_errors: { 'Failing Indicator': 'Error message' }
            })
        )

        createComponent()
        tick()
        fixture.detectChanges()

        expect(fixture.debugElement.query(By.css('.artifact-errors'))).toBeTruthy()
    }))

    it('should not display the artifact errors icon when there are none', fakeAsync(() => {
        createComponent()
        tick()
        fixture.detectChanges()

        expect(fixture.debugElement.query(By.css('.artifact-errors'))).toBeFalsy()
    }))

    it('should display a language mismatch icon when computation language differs from active language', fakeAsync(() => {
        mockPluginService.getComputationMetadata = jest
            .fn()
            .mockReturnValue(of({ ...buildMetadata(), language: SupportedLanguage.DE }))

        createComponent()
        tick()
        fixture.detectChanges()

        expect(fixture.debugElement.query(By.css('.language-mismatch'))).toBeTruthy()
    }))

    it('should not display a language mismatch icon when computation language matches active language', fakeAsync(() => {
        mockPluginService.getComputationMetadata = jest
            .fn()
            .mockReturnValue(of({ ...buildMetadata(), language: SupportedLanguage.EN }))

        createComponent()
        tick()
        fixture.detectChanges()

        expect(fixture.debugElement.query(By.css('.language-mismatch'))).toBeFalsy()
    }))

    it('should treat missing computation language as english and display a mismatch icon', fakeAsync(() => {
        createComponent()
        translocoService.setActiveLang(SupportedLanguage.DE)
        tick()
        fixture.detectChanges()

        expect(fixture.debugElement.query(By.css('.language-mismatch'))).toBeTruthy()
    }))

    it('should open the parameters dialog with params and requested params', fakeAsync(() => {
        mockPluginService.getComputationMetadata = jest
            .fn()
            .mockReturnValue(of({ ...buildMetadata(), requested_params: { foo: 'bar' } }))

        createComponent()
        tick()

        component.viewParameters()

        expect(mockMatDialog.open).toHaveBeenCalledWith(
            ComputationParametersDialogComponent,
            expect.objectContaining({
                data: {
                    params: { foo: 'bar' },
                    requestedParams: { foo: 'bar' }
                },
                autoFocus: false
            })
        )
    }))

    it('should bookmark the computation from the detail view', fakeAsync(() => {
        createComponent()
        tick()

        component.toggleBookmark()
        tick()

        expect(mockPluginService.storeNewComputes).toHaveBeenCalledWith(
            expect.objectContaining({
                correlation_uuid: UUID,
                pluginId: 'test_plugin',
                status: 'SUCCESS',
                aoiName: 'Test AOI'
            })
        )
    }))

    it('should tear down viewer and map state on destroy', fakeAsync(() => {
        createComponent()
        tick()

        fixture.destroy()

        expect(mockArtifactViewerService.closeArtifactViewer).toHaveBeenCalled()
        expect(mockMapService.removeFocusedLayer).toHaveBeenCalled()
        expect(mockMapArtifactManager.clearTransientArtifacts).toHaveBeenCalledWith(UUID)
        expect(mockMapArtifactManager.setActiveArtifactId).toHaveBeenCalledWith(null)
    }))
})
