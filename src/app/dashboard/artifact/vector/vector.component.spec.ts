import { HttpClient, HttpClientModule } from '@angular/common/http'
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing'
import { MapArtifactManagerService } from '@app/dashboard/map/map-artifact-manager.service'
import { MapService } from '@app/dashboard/map/map.service'
import { jest } from '@jest/globals'
import { delay, of } from 'rxjs'
import { VectorComponent } from './vector.component'

describe('VectorComponent', () => {
    let component: VectorComponent
    let fixture: ComponentFixture<VectorComponent>
    let httpClientSpy: jest.Mocked<HttpClient>
    let mapServiceSpy: jest.Mocked<MapService>
    let mapArtifactManagerSpy: jest.Mocked<MapArtifactManagerService>

    beforeEach(() => {
        httpClientSpy = {
            post: jest.fn(),
            get: jest.fn()
        } as unknown as jest.Mocked<HttpClient>

        mapServiceSpy = {
            addGeoJsonLayer: jest.fn(),
            addPmtilesLayer: jest.fn()
        } as unknown as jest.Mocked<MapService>

        mapArtifactManagerSpy = {
            updateLayerInfo: jest.fn(),
            isArtifactOnMap: jest.fn().mockReturnValue(true)
        } as unknown as jest.Mocked<MapArtifactManagerService>

        TestBed.configureTestingModule({
            imports: [VectorComponent, HttpClientModule],
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpClientSpy
                },
                {
                    provide: MapService,
                    useValue: mapServiceSpy
                },
                {
                    provide: MapArtifactManagerService,
                    useValue: mapArtifactManagerSpy
                }
            ]
        })
        fixture = TestBed.createComponent(VectorComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should not process unsupported file formats', () => {
        component.inputData = {
            url: 'http://test_url',
            artifact: {
                primary: true,
                name: 'geojson',
                modality: 'VECTOR_MAP_LAYER',
                tags: [],
                summary: 'test summary',
                description: 'test description',
                correlation_uuid: '6b6ea4ba-7c0c-4e5d-a2ee-0f32a743f88e',
                filename: '606de3f8-7404-4b3a-af5d-85292848235f',
                attachments: {},
                sources: [],
                rank: 0
            }
        }
        component.ngOnInit()

        expect(httpClientSpy.get).not.toHaveBeenCalled()
        expect(mapServiceSpy.addGeoJsonLayer).not.toHaveBeenCalled()
        expect(mapServiceSpy.addPmtilesLayer).not.toHaveBeenCalled()
    })

    it('should pass geojson to map service and register layer', fakeAsync(() => {
        const mockGeoJsonData = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [102.0, 0.5] },
                    properties: { prop0: 'value0' }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [102.0, 0.0],
                            [103.0, 1.0],
                            [104.0, 0.0],
                            [105.0, 1.0]
                        ]
                    },
                    properties: {
                        prop0: 'value0',
                        prop1: 0.0
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [
                            [
                                [100.0, 0.0],
                                [101.0, 0.0],
                                [101.0, 1.0],
                                [100.0, 1.0],
                                [100.0, 0.0]
                            ]
                        ]
                    },
                    properties: {
                        prop0: 'value0',
                        prop1: { this: 'that' }
                    }
                }
            ]
        }

        const mockLayer = {
            layerIds: ['layer-1', 'layer-2'],
            sourceId: 'source-123',
            name: 'geojson'
        }

        httpClientSpy.get.mockReturnValue(of(mockGeoJsonData).pipe(delay(100)))
        mapServiceSpy.addGeoJsonLayer.mockReturnValue(mockLayer)

        const artifact = {
            primary: true,
            name: 'geojson',
            modality: 'VECTOR_MAP_LAYER' as const,
            tags: [],
            summary: 'test summary',
            description: 'test description',
            correlation_uuid: '6b6ea4ba-7c0c-4e5d-a2ee-0f32a743f88e',
            filename: '606de3f8-7404-4b3a-af5d-85292848235f.geojson',
            attachments: {},
            sources: [],
            rank: 0
        }
        component.inputData = {
            url: 'https://storage.example/object?X-Amz-Signature=signed',
            artifact
        }
        component.ngOnInit()

        expect(httpClientSpy.get).toHaveBeenCalledWith('https://storage.example/object?X-Amz-Signature=signed')
        expect(mapServiceSpy.addGeoJsonLayer).not.toHaveBeenCalled()
        expect(mapArtifactManagerSpy.updateLayerInfo).not.toHaveBeenCalled()

        tick(100)
        fixture.detectChanges()

        expect(mapServiceSpy.addGeoJsonLayer).toHaveBeenCalledWith(mockGeoJsonData, 'geojson')
        expect(mapArtifactManagerSpy.updateLayerInfo).toHaveBeenCalledWith(
            artifact,
            mockLayer.layerIds,
            mockLayer.sourceId
        )
    }))

    it('should pass pmtiles url to map service', () => {
        const mockLayer = {
            layerIds: ['layer-1'],
            sourceId: 'source-123',
            name: 'pmtiles-layer'
        }
        mapServiceSpy.addPmtilesLayer.mockResolvedValue(mockLayer)

        component.inputData = {
            url: 'https://storage.example/object?download=layer.geojson',
            artifact: {
                primary: true,
                name: 'pmtiles-layer',
                modality: 'VECTOR_MAP_LAYER',
                tags: [],
                summary: 'test summary',
                description: 'test description',
                correlation_uuid: '6b6ea4ba-7c0c-4e5d-a2ee-0f32a743f88e',
                filename: '606de3f8-7404-4b3a-af5d-85292848235f.pmtiles',
                attachments: {},
                sources: [],
                rank: 0
            }
        }
        component.ngOnInit()
        fixture.detectChanges()

        expect(httpClientSpy.get).not.toHaveBeenCalled()
        expect(mapServiceSpy.addPmtilesLayer).toHaveBeenCalledWith(
            'https://storage.example/object?download=layer.geojson',
            'pmtiles-layer'
        )
    })
})
