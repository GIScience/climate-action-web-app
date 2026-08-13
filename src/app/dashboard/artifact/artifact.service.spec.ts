import { HttpClient, HttpClientModule } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { jest } from '@jest/globals'
import { of } from 'rxjs'
import { Artifact, ChartData, LegendObject, PlotlyChartData } from './artifact.interface'
import { ArtifactService } from './artifact.service'

describe('ArtifactService', () => {
    let service: ArtifactService
    let httpClientSpy: {
        post: jest.Mock
        get: jest.Mock
    }

    const correlation_uuid = 'd9660bee-85ca-40c1-80b8-b51c5fd0cd9f'
    const store_uuid = '063c0ef6-5955-4b10-84c2-45e7b4cccf05'
    const presigned_url = `https://storage.example.com/${correlation_uuid}/${store_uuid}?X-Amz-Signature=abc`

    const test_artifact = {
        name: 'test_artifact',
        modality: 'IMAGE',
        summary: 'artifact summary',
        description: 'artifact description',
        correlation_uuid: correlation_uuid,
        filename: store_uuid,
        attachments: {}
    } as Artifact

    const test_legend = { legend_type: 'DISCRETE', legend_data: { a: '#ffffff' } } as LegendObject

    const test_geojson = {
        name: 'test_artifact',
        modality: 'VECTOR_MAP_LAYER',
        summary: 'artifact summary',
        description: 'artifact description',
        correlation_uuid: correlation_uuid,
        filename: store_uuid,
        attachments: { legend: test_legend }
    } as Artifact

    const test_chart = {
        chart_type: 'PIE',
        color: ['#FF0000', '#0000FF'],
        x: ['x1', 'x2'],
        y: [1, 2]
    } as ChartData

    beforeEach(() => {
        httpClientSpy = {
            post: jest.fn().mockImplementation(() => of({})),
            get: jest.fn().mockImplementation(() => of({ go_to: presigned_url }))
        }

        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpClientSpy
                }
            ]
        })
        service = TestBed.inject(ArtifactService)
    })

    it('should be created', () => {
        expect(service).toBeTruthy()
    })

    it('should get markdown artifact item', done => {
        service.getMarkdown(test_artifact)
        service.markdown.subscribe(x => {
            expect(x).toEqual(
                expect.objectContaining({
                    ...test_artifact,
                    url: presigned_url
                })
            )
            done()
        })
    })

    it('should get vector artifact item', done => {
        service.getVector(test_artifact)
        service.vector.subscribe(x => {
            expect(x).toEqual(
                expect.objectContaining({
                    ...test_artifact,
                    url: presigned_url
                })
            )
            done()
        })
    })

    it('should get raster artifact item', done => {
        service.getRaster(test_artifact)
        service.raster.subscribe(x => {
            expect(x).toEqual(
                expect.objectContaining({
                    ...test_artifact,
                    url: presigned_url
                })
            )
            done()
        })
    })

    it('should get table artifact item', done => {
        service.getTable(test_artifact)
        service.table.subscribe(x => {
            expect(x).toEqual(
                expect.objectContaining({
                    ...test_artifact,
                    url: presigned_url
                })
            )
            done()
        })
    })

    it('should get chart artifact item', done => {
        httpClientSpy.get.mockReturnValueOnce(of({ go_to: presigned_url })).mockReturnValueOnce(of(test_chart))

        service.getChart(test_artifact)
        service.chart.subscribe(x => {
            expect(x).toEqual({
                data: test_chart,
                artifact: test_artifact
            })
            expect(httpClientSpy.get).toHaveBeenCalledWith(
                expect.stringContaining(`/store/${correlation_uuid}/${store_uuid}`)
            )
            expect(httpClientSpy.get).toHaveBeenCalledWith(presigned_url)
            done()
        })
    })

    it('should get plotly chart artifact item using display_filename', done => {
        const test_plotly_chart = { data: [], layout: {} } as PlotlyChartData
        const display_filename = 'simple_scatter_chart.json'
        const test_plotly_artifact = {
            ...test_artifact,
            modality: 'CHART_PLOTLY',
            attachments: { display_filename }
        } as Artifact

        httpClientSpy.get.mockReturnValue(of(test_plotly_chart))

        service.getPlotlyChart(test_plotly_artifact)
        service.plotlyChart.subscribe(x => {
            expect(x).toEqual({
                data: test_plotly_chart,
                artifact: test_plotly_artifact
            })
            expect(httpClientSpy.get).toHaveBeenCalledWith(
                expect.stringContaining(`/store/${correlation_uuid}/${display_filename}`)
            )
            done()
        })
    })

    it('should get plotly chart artifact item falling back to filename', done => {
        httpClientSpy.get.mockReturnValue(of({ data: [], layout: {} } as PlotlyChartData))

        service.getPlotlyChart(test_artifact)
        service.plotlyChart.subscribe(() => {
            expect(httpClientSpy.get).toHaveBeenCalledWith(
                expect.stringContaining(`/store/${correlation_uuid}/${store_uuid}`)
            )
            done()
        })
    })

    it('should augment legend', done => {
        service.getLegend(test_geojson)
        service.legend.subscribe(x => {
            expect(x?.title).toEqual('test_artifact')
            done()
        })
    })
})
