import { HttpClientModule } from '@angular/common/http'
import { ElementRef, QueryList } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { SafeUrl } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, Observable } from 'rxjs'
import { getTranslocoTestingModule, MockToastrService } from '../../../../jest.mocks'
import { ArtifactData, ArtifactEntity, ChartData, LegendObject, PlotlyChartData } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationBasicInfo } from '../computations-index/computation.interface'
import { PluginService } from '../plugin/plugin.service'
import { ExportPDFService } from './export-pdf.service'
import { ReportComponent } from './report.component'
import { ReportService } from './report.service'

// Mock interfaces for proper typing
interface MockReportService {
    artifacts$: Observable<ArtifactEntity[]>
    isVisible$: Observable<boolean>
    isExportReady$: Observable<boolean>
    MAX_ARTIFACTS: 10
    isMapArtifact: jest.MockedFunction<(modality: ArtifactEntity['modality']) => boolean>
    getArtifactKey: jest.MockedFunction<(artifact: Pick<ArtifactEntity, 'correlation_uuid' | 'filename'>) => string>
    getServiceForArtifact: jest.MockedFunction<(artifact: ArtifactEntity) => ArtifactService | undefined>
    removeArtifact: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    closeReport: jest.MockedFunction<() => void>
    getComputationInfoForArtifact: jest.MockedFunction<(artifact: ArtifactEntity) => ComputationBasicInfo | undefined>
    _artifactsSubject: BehaviorSubject<ArtifactEntity[]>
    _isVisibleSubject: BehaviorSubject<boolean>
    _isExportReadySubject: BehaviorSubject<boolean>
}

interface MockExportPDFService {
    exportToPDF: jest.MockedFunction<
        (
            artifacts: ArtifactEntity[],
            artifactContainers: QueryList<ElementRef>,
            getComputationInfo: (artifact: ArtifactEntity) => ComputationBasicInfo | undefined
        ) => Promise<void>
    >
}

type MockPluginService = object

interface MockArtifactService {
    clearLegend: jest.MockedFunction<() => void>
    legend: BehaviorSubject<LegendObject | null>
    getLegend: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    currentUrl: string | null
    downloadJsonHref: SafeUrl | null
    apiUrl: string
    markdownSubject: BehaviorSubject<ArtifactData | null>
    markdown: Observable<ArtifactData | null>
    imageSubject: BehaviorSubject<ArtifactData | null>
    image: Observable<ArtifactData | null>
    tableSubject: BehaviorSubject<ArtifactData | null>
    table: Observable<ArtifactData | null>
    vectorSubject: BehaviorSubject<ArtifactData | null>
    vector: Observable<ArtifactData | null>
    rasterSubject: BehaviorSubject<ArtifactData | null>
    raster: Observable<ArtifactData | null>
    legendSubject: BehaviorSubject<LegendObject | null>
    chartSubject: BehaviorSubject<{ data: ChartData | null; artifact: ArtifactEntity | null }>
    chart: Observable<{ data: ChartData | null; artifact: ArtifactEntity | null }>
    plotlyChartSubject: BehaviorSubject<{ data: PlotlyChartData | null; artifact: ArtifactEntity | null }>
    plotlyChart: Observable<{ data: PlotlyChartData | null; artifact: ArtifactEntity | null }>
    getMarkdown: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    getImage: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    getTable: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    getVector: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    getRaster: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    getChart: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    getPlotlyChart: jest.MockedFunction<(artifact: ArtifactEntity) => void>
}

jest.mock('../map/map.service', () => ({
    MapService: jest.fn().mockImplementation(() => ({
        initMap: jest.fn(),
        highlightAoI: jest.fn(),
        addGeoJsonLayer: jest.fn(),
        addGeoTiffLayer: jest.fn()
    }))
}))

describe('ReportComponent', () => {
    let component: ReportComponent
    let fixture: ComponentFixture<ReportComponent>
    let reportService: jest.Mocked<MockReportService>
    let exportPDFService: jest.Mocked<MockExportPDFService>
    let pluginService: jest.Mocked<MockPluginService>
    let toastr: MockToastrService

    const mockArtifact: ArtifactEntity = {
        filename: 'test-123',
        name: 'Test Artifact',
        modality: 'MARKDOWN',
        primary: true,
        tags: [],
        correlation_uuid: '12345678-1234-1234-1234-123456789012',
        attachments: {},
        sources: [],
        rank: 0
    }

    const mockMapArtifact: ArtifactEntity = {
        filename: 'map-123',
        name: 'Test Map',
        modality: 'VECTOR_MAP_LAYER',
        primary: true,
        tags: [],
        correlation_uuid: '12345678-1234-1234-1234-123456789012',
        attachments: {},
        sources: [],
        rank: 0
    }

    const mockComputationInfo: ComputationBasicInfo = {
        aoiName: 'Test AOI',
        pluginName: 'Test Plugin',
        correlation_uuid: '12345678-1234-1234-1234-123456789012',
        request_ts: new Date()
    }

    beforeEach(async () => {
        const artifactsSubject = new BehaviorSubject<ArtifactEntity[]>([])
        const isVisibleSubject = new BehaviorSubject<boolean>(false)
        const isExportReadySubject = new BehaviorSubject<boolean>(false)

        reportService = {
            artifacts$: artifactsSubject.asObservable(),
            isVisible$: isVisibleSubject.asObservable(),
            isExportReady$: isExportReadySubject.asObservable(),
            MAX_ARTIFACTS: 10,
            isMapArtifact: jest
                .fn()
                .mockImplementation(modality => modality === 'VECTOR_MAP_LAYER' || modality === 'RASTER_MAP_LAYER'),
            getArtifactKey: jest
                .fn()
                .mockImplementation(artifact => `${artifact.correlation_uuid}__${artifact.filename}`),
            getServiceForArtifact: jest.fn(),
            removeArtifact: jest.fn(),
            closeReport: jest.fn(),
            getComputationInfoForArtifact: jest.fn().mockReturnValue(mockComputationInfo),
            _artifactsSubject: artifactsSubject,
            _isVisibleSubject: isVisibleSubject,
            _isExportReadySubject: isExportReadySubject
        } as jest.Mocked<MockReportService>

        exportPDFService = {
            exportToPDF: jest.fn().mockResolvedValue(undefined)
        } as jest.Mocked<MockExportPDFService>

        pluginService = {} as jest.Mocked<MockPluginService>

        await TestBed.configureTestingModule({
            imports: [ReportComponent, HttpClientModule, NoopAnimationsModule, getTranslocoTestingModule()],
            providers: [
                { provide: ToastrService, useClass: MockToastrService },
                { provide: ReportService, useValue: reportService },
                { provide: ExportPDFService, useValue: exportPDFService },
                { provide: PluginService, useValue: pluginService },
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

        fixture = TestBed.createComponent(ReportComponent)
        component = fixture.componentInstance
        toastr = TestBed.inject(ToastrService) as unknown as MockToastrService
        fixture.detectChanges()
    })

    describe('ngOnInit', () => {
        it('should subscribe to artifacts$ and handle artifact changes', () => {
            const artifacts = [mockArtifact, mockMapArtifact]
            reportService._artifactsSubject.next(artifacts)

            expect(component.artifacts).toEqual(artifacts)
        })

        it('should create MapService for map artifacts', () => {
            const mockArtifactService: MockArtifactService = {
                clearLegend: jest.fn(),
                legend: new BehaviorSubject<LegendObject | null>(null),
                getLegend: jest.fn(),
                currentUrl: null,
                downloadJsonHref: null,
                apiUrl: 'mock-api-url',
                markdownSubject: new BehaviorSubject<ArtifactData | null>(null),
                markdown: new BehaviorSubject<ArtifactData | null>(null).asObservable(),
                imageSubject: new BehaviorSubject<ArtifactData | null>(null),
                image: new BehaviorSubject<ArtifactData | null>(null).asObservable(),
                tableSubject: new BehaviorSubject<ArtifactData | null>(null),
                table: new BehaviorSubject<ArtifactData | null>(null).asObservable(),
                vectorSubject: new BehaviorSubject<ArtifactData | null>(null),
                vector: new BehaviorSubject<ArtifactData | null>(null).asObservable(),
                rasterSubject: new BehaviorSubject<ArtifactData | null>(null),
                raster: new BehaviorSubject<ArtifactData | null>(null).asObservable(),
                legendSubject: new BehaviorSubject<LegendObject | null>(null),
                chartSubject: new BehaviorSubject<{ data: ChartData | null; artifact: ArtifactEntity | null }>({
                    data: null,
                    artifact: null
                }),
                chart: new BehaviorSubject<{ data: ChartData | null; artifact: ArtifactEntity | null }>({
                    data: null,
                    artifact: null
                }).asObservable(),
                plotlyChartSubject: new BehaviorSubject<{
                    data: PlotlyChartData | null
                    artifact: ArtifactEntity | null
                }>({ data: null, artifact: null }),
                plotlyChart: new BehaviorSubject<{ data: PlotlyChartData | null; artifact: ArtifactEntity | null }>({
                    data: null,
                    artifact: null
                }).asObservable(),
                getMarkdown: jest.fn(),
                getImage: jest.fn(),
                getTable: jest.fn(),
                getVector: jest.fn(),
                getRaster: jest.fn(),
                getChart: jest.fn(),
                getPlotlyChart: jest.fn()
            }

            reportService.isMapArtifact.mockImplementation(modality => {
                return modality === 'VECTOR_MAP_LAYER' || modality === 'RASTER_MAP_LAYER'
            })
            reportService.getServiceForArtifact.mockReturnValue(mockArtifactService as unknown as ArtifactService)

            fixture.detectChanges()

            expect(component.artifacts).toEqual([])

            expect((component as unknown as { mapServices: Map<string, unknown> }).mapServices.size).toBe(0)
            reportService._artifactsSubject.next([mockMapArtifact])
            fixture.detectChanges()

            expect(reportService.isMapArtifact).toHaveBeenCalledWith(mockMapArtifact.modality)
            expect(reportService.getServiceForArtifact).toHaveBeenCalledWith(mockMapArtifact)
            expect(mockArtifactService.clearLegend).toHaveBeenCalled()
            expect(mockArtifactService.getLegend).toHaveBeenCalledWith(mockMapArtifact)
        })

        it('should create distinct map services for artifacts sharing a filename but differing in correlation_uuid', () => {
            const artifactA: ArtifactEntity = {
                ...mockMapArtifact,
                correlation_uuid: 'aaaaaaaa-0000-0000-0000-000000000000'
            }
            const artifactB: ArtifactEntity = {
                ...mockMapArtifact,
                correlation_uuid: 'bbbbbbbb-0000-0000-0000-000000000000'
            }

            reportService._artifactsSubject.next([artifactA, artifactB])
            fixture.detectChanges()

            const mapServices = (component as unknown as { mapServices: Map<string, unknown> }).mapServices
            expect(mapServices.size).toBe(2)
        })

        it('should handle visibility changes', () => {
            component.artifacts = [mockMapArtifact]
            reportService._isVisibleSubject.next(true)
            expect(component.isVisible).toBe(true)
            reportService._isVisibleSubject.next(false)
            expect(component.isVisible).toBe(false)
        })

        it('should update map loading state from export readiness', () => {
            reportService._isExportReadySubject.next(false)
            expect(component.isMapsLoading).toBe(false)

            reportService._artifactsSubject.next([mockMapArtifact])
            reportService._isExportReadySubject.next(false)
            expect(component.isMapsLoading).toBe(true)

            reportService._isExportReadySubject.next(true)
            expect(component.isMapsLoading).toBe(false)
        })
    })

    describe('getComputationInfo', () => {
        it('should return computation info for artifact', () => {
            const result = component.getComputationInfo(mockArtifact)

            expect(reportService.getComputationInfoForArtifact).toHaveBeenCalledWith(mockArtifact)
            expect(result).toEqual(mockComputationInfo)
        })
    })

    describe('exportToPDF', () => {
        it('should call ExportPDFService with correct parameters', async () => {
            component.artifacts = [mockArtifact, mockMapArtifact]

            const mockElementRef = { nativeElement: document.createElement('div') }
            component.artifactContainers = {
                toArray: () => [mockElementRef]
            } as QueryList<ElementRef>

            await component.exportToPDF()

            expect(exportPDFService.exportToPDF).toHaveBeenCalledWith(
                component.artifacts,
                component.artifactContainers,
                expect.any(Function)
            )
            expect(component.hasExported).toBe(true)
        })

        it('should bind getComputationInfo correctly', async () => {
            component.artifacts = [mockArtifact]
            component.artifactContainers = {
                toArray: () => []
            } as unknown as QueryList<ElementRef>

            await component.exportToPDF()

            const boundFunction = exportPDFService.exportToPDF.mock.calls[0][2]
            const result = boundFunction(mockArtifact)

            expect(result).toEqual(mockComputationInfo)
        })

        it('should keep export button enabled while maps are loading', () => {
            reportService._isVisibleSubject.next(true)
            reportService._artifactsSubject.next([mockMapArtifact])
            reportService._isExportReadySubject.next(false)
            fixture.detectChanges()

            const exportButton = fixture.nativeElement.querySelector('.export-btn') as HTMLButtonElement
            expect(exportButton.disabled).toBe(false)
        })
    })

    describe('handleExport', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        it('should show maps rendering toast and skip export when maps are loading', () => {
            component.isMapsLoading = true
            const exportSpy = jest.spyOn(component, 'exportToPDF')

            component.handleExport()

            expect(toastr.info).toHaveBeenCalled()
            expect(exportSpy).not.toHaveBeenCalled()
        })

        it('should export when maps are ready', () => {
            component.isMapsLoading = false
            const exportSpy = jest.spyOn(component, 'exportToPDF').mockResolvedValue(undefined)

            component.handleExport()

            expect(toastr.info).not.toHaveBeenCalled()
            expect(exportSpy).toHaveBeenCalled()
        })
    })
})
