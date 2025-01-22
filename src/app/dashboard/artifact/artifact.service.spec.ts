import {TestBed} from '@angular/core/testing'

import {ArtifactService} from './artifact.service'
import {HttpClient, HttpClientModule} from '@angular/common/http'
import {Artifact, ChartData} from './artifact.interface'
import {of} from 'rxjs'
import SpyObj = jasmine.SpyObj

describe('ArtifactService', () => {
    let service: ArtifactService
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
        store_id: store_uuid
    } as Artifact

    const test_chart = {
        chart_type: 'PIE',
        color: ['#FF0000', '#0000FF'],
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
        service = TestBed.inject(ArtifactService)
    })

    it('should be created', () => {
        expect(service).toBeTruthy()
    })

    it('should get markdown artifact item', done => {
        service.getMarkdown(test_artifact)
        service.markdown.subscribe((x) => {
            expect(x).toEqual({ url: `/api/v1/gateway/store/${correlation_uuid}/${store_uuid}`, ...test_artifact })
            done()
        })
    })

    it('should get geojson artifact item', done => {
        service.getGeoJson(test_artifact)
        service.geojson.subscribe((x) => {
            expect(x).toEqual({
                url: `/api/v1/gateway/store/${correlation_uuid}/${store_uuid}`,
                ...test_artifact
            })
            done()
        })
    })

    it('should get geotiff artifact item', done => {
        service.getGeoTiff(test_artifact)
        service.geotiff.subscribe((x) => {
            expect(x).toEqual({
                url: `/api/v1/gateway/store/${correlation_uuid}/${store_uuid}`,
                ...test_artifact
            })
            done()
        })
    })

    it('should get table artifact item', done => {
        service.getTable(test_artifact)
        service.table.subscribe((x) => {
            expect(x).toEqual({ url: `/api/v1/gateway/store/${correlation_uuid}/${store_uuid}`, ...test_artifact })
            done()
        })
    })

    it('should get chart artifact item', done => {
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
