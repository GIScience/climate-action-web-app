import { HttpClientModule } from '@angular/common/http'
import { ElementRef, QueryList } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { SafeUrl } from '@angular/platform-browser'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, Observable } from 'rxjs'
import { MockToastrService } from '../../../../jest.mocks'
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
    MAX_ARTIFACTS: 10
    isMapArtifact: jest.MockedFunction<(artifact: ArtifactEntity) => boolean>
    getServiceForArtifact: jest.MockedFunction<(artifact: ArtifactEntity) => ArtifactService | undefined>
    removeArtifact: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    closeReport: jest.MockedFunction<() => void>
    getComputationInfoForArtifact: jest.MockedFunction<(artifact: ArtifactEntity) => ComputationBasicInfo | undefined>
    _artifactsSubject: BehaviorSubject<ArtifactEntity[]>
    _isVisibleSubject: BehaviorSubject<boolean>
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
    geojsonSubject: BehaviorSubject<ArtifactData | null>
    geojson: Observable<ArtifactData | null>
    geotiffSubject: BehaviorSubject<ArtifactData | null>
    geotiff: Observable<ArtifactData | null>
    legendSubject: BehaviorSubject<LegendObject | null>
    chartSubject: BehaviorSubject<{ data: ChartData | null; artifact: ArtifactEntity | null }>
    chart: Observable<{ data: ChartData | null; artifact: ArtifactEntity | null }>
    plotlyChartSubject: BehaviorSubject<{ data: PlotlyChartData | null; artifact: ArtifactEntity | null }>
    plotlyChart: Observable<{ data: PlotlyChartData | null; artifact: ArtifactEntity | null }>
    getMarkdown: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    getImage: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    getTable: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    getGeoJson: jest.MockedFunction<(artifact: ArtifactEntity) => void>
    getGeoTiff: jest.MockedFunction<(artifact: ArtifactEntity) => void>
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

    const mockArtifact: ArtifactEntity = {
        store_id: 'test-123',
        name: 'Test Artifact',
        modality: 'MARKDOWN',
        primary: true,
        file_path: '/path/to/test/artifact',
        correlation_uuid: '12345678-1234-1234-1234-123456789012',
        attachments: {}
    }

    const mockMapArtifact: ArtifactEntity = {
        store_id: 'map-123',
        name: 'Test Map',
        modality: 'MAP_LAYER_GEOJSON',
        primary: true,
        file_path: '/path/to/map/artifact',
        correlation_uuid: '12345678-1234-1234-1234-123456789012',
        attachments: {}
    }

    const mockComputationInfo: ComputationBasicInfo = {
        aoiName: 'Test AOI',
        pluginName: 'Test Plugin',
        correlation_uuid: '12345678-1234-1234-1234-123456789012',
        timestamp: new Date()
    }

    beforeEach(async () => {
        const artifactsSubject = new BehaviorSubject<ArtifactEntity[]>([])
        const isVisibleSubject = new BehaviorSubject<boolean>(false)

        reportService = {
            artifacts$: artifactsSubject.asObservable(),
            isVisible$: isVisibleSubject.asObservable(),
            MAX_ARTIFACTS: 10,
            isMapArtifact: jest
                .fn()
                .mockImplementation(
                    artifact => artifact.modality === 'MAP_LAYER_GEOJSON' || artifact.modality === 'MAP_LAYER_GEOTIFF'
                ),
            getServiceForArtifact: jest.fn(),
            removeArtifact: jest.fn(),
            closeReport: jest.fn(),
            getComputationInfoForArtifact: jest.fn().mockReturnValue(mockComputationInfo),
            _artifactsSubject: artifactsSubject,
            _isVisibleSubject: isVisibleSubject
        } as jest.Mocked<MockReportService>

        exportPDFService = {
            exportToPDF: jest.fn().mockResolvedValue(undefined)
        } as jest.Mocked<MockExportPDFService>

        pluginService = {} as jest.Mocked<MockPluginService>

        await TestBed.configureTestingModule({
            imports: [ReportComponent, HttpClientModule],
            providers: [
                { provide: ToastrService, useClass: MockToastrService },
                { provide: ReportService, useValue: reportService },
                { provide: ExportPDFService, useValue: exportPDFService },
                { provide: PluginService, useValue: pluginService }
            ]
        }).compileComponents()

        fixture = TestBed.createComponent(ReportComponent)
        component = fixture.componentInstance
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
                geojsonSubject: new BehaviorSubject<ArtifactData | null>(null),
                geojson: new BehaviorSubject<ArtifactData | null>(null).asObservable(),
                geotiffSubject: new BehaviorSubject<ArtifactData | null>(null),
                geotiff: new BehaviorSubject<ArtifactData | null>(null).asObservable(),
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
                getGeoJson: jest.fn(),
                getGeoTiff: jest.fn(),
                getChart: jest.fn(),
                getPlotlyChart: jest.fn()
            }

            reportService.isMapArtifact.mockImplementation(artifact => {
                return artifact.modality === 'MAP_LAYER_GEOJSON' || artifact.modality === 'MAP_LAYER_GEOTIFF'
            })
            reportService.getServiceForArtifact.mockReturnValue(mockArtifactService as unknown as ArtifactService)

            fixture.detectChanges()

            expect(component.artifacts).toEqual([])

            expect((component as unknown as { mapServices: Map<string, unknown> }).mapServices.size).toBe(0)
            reportService._artifactsSubject.next([mockMapArtifact])
            fixture.detectChanges()

            expect(reportService.isMapArtifact).toHaveBeenCalledWith(mockMapArtifact)
            expect(reportService.getServiceForArtifact).toHaveBeenCalledWith(mockMapArtifact)
            expect(mockArtifactService.clearLegend).toHaveBeenCalled()
            expect(mockArtifactService.getLegend).toHaveBeenCalledWith(mockMapArtifact)
        })

        it('should handle visibility changes', () => {
            component.artifacts = [mockMapArtifact]
            reportService._isVisibleSubject.next(true)
            expect(component.isVisible).toBe(true)
            reportService._isVisibleSubject.next(false)
            expect(component.isVisible).toBe(false)
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
    })
})
