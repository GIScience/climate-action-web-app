import {TestBed} from '@angular/core/testing'

import {ReportService} from './report.service'
import {HttpClient, HttpClientModule} from '@angular/common/http'
import {Artifact, ChartData} from '../artifact/artifact.interface'
import {of} from 'rxjs'
import SpyObj = jasmine.SpyObj

describe('ReportService', () => {
    let service: ReportService
    let httpClientSpy: SpyObj<HttpClient>

    const correlation_uuid = 'd9660bee-85ca-40c1-80b8-b51c5fd0cd9f'
    const store_uuid = '063c0ef6-5955-4b10-84c2-45e7b4cccf05'

    const test_artifact = {
        name: 'test_artifact',
        modality: 'IMAGE',
        file_path: './',
        summary: 'artifact summary',
        description: 'artifact description',
        correlation_uuid: correlation_uuid,
        params: {},
        store_id: store_uuid
    } as Artifact

    const test_chart = {
        chart_type: 'pie',
        color: ['red', 'blue'],
        x: ['x1', 'x2'],
        y: [1, 2]
    } as ChartData

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['post', 'get'])

        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpClientSpy
                }
            ]
        })
        service = TestBed.inject(ReportService)
    })

    it('should be created', () => {
        expect(service).toBeTruthy()
    })

    it('should get markdown report item', done => {
        service.getMarkdown(test_artifact)
        service.markdown.subscribe((x) => {
            expect(x).toEqual({ url: `/api/v1/gateway/store/${correlation_uuid}/${store_uuid}`, artifact: test_artifact })
            done()
        })
    })

    it('should get geojson report item', done => {
        service.getGeoJson(test_artifact)
        service.geojson.subscribe((x) => {
            expect(x).toEqual({
                url: `/api/v1/gateway/store/${correlation_uuid}/${store_uuid}`,
                artifact: test_artifact
            })
            done()
        })
    })

    it('should get geotiff report item', done => {
        service.getGeoTiff(test_artifact)
        service.geotiff.subscribe((x) => {
            expect(x).toEqual({
                url: `/api/v1/gateway/store/${correlation_uuid}/${store_uuid}`,
                artifact: test_artifact
            })
            done()
        })
    })

    it('should get table report item', done => {
        service.getTable(test_artifact)
        service.table.subscribe((x) => {
            expect(x).toEqual({ url: `/api/v1/gateway/store/${correlation_uuid}/${store_uuid}`, artifact: test_artifact })
            done()
        })
    })

    it('should get chart report item', done => {
        httpClientSpy.get.withArgs(`/api/v1/gateway/store/${correlation_uuid}/${store_uuid}`).and
            .returnValue(of(test_chart))

        service.getChart(test_artifact)
        service.chart.subscribe((x) => {
            expect(x).toEqual({
                data: test_chart,
                artifact: test_artifact
            })
            done()
        })
    })
})
