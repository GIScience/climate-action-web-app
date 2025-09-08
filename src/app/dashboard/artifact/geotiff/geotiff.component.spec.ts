import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { jest } from '@jest/globals'
import maplibregl from 'maplibre-gl'
import { MapService } from '../../map/map.service'
import { GeoTiffComponent } from './geotiff.component'

describe('GeoTiffComponent', () => {
    let component: GeoTiffComponent
    let fixture: ComponentFixture<GeoTiffComponent>
    let mapServiceSpy: jest.Mocked<MapService>

    beforeEach(async () => {
        mapServiceSpy = {
            addGeoTiffLayer: jest.fn()
        } as unknown as jest.Mocked<MapService>

        await TestBed.configureTestingModule({
            imports: [GeoTiffComponent, HttpClientModule],
            providers: [{ provide: MapService, useValue: mapServiceSpy }]
        }).compileComponents()

        fixture = TestBed.createComponent(GeoTiffComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should fail to initialize map when input data is missing', () => {
        component.inputData = undefined
        component.ngOnInit()
        expect(mapServiceSpy.addGeoTiffLayer).not.toHaveBeenCalled()
    })

    it('should initialize map with valid input data', async () => {
        const mockUrl = 'http://test_url'
        const mockLayer = {
            id: 'geotiff-geotiff-123456789',
            sourceId: 'source-geotiff-geotiff-123456789',
            name: 'geotiff',
            setOpacity: jest.fn().mockReturnValue(undefined) as (opacity: number) => maplibregl.Map | undefined,
            setVisible: jest.fn().mockReturnValue(undefined) as (visible: boolean) => maplibregl.Map | undefined
        }

        mapServiceSpy.addGeoTiffLayer.mockResolvedValue(mockLayer)

        component.inputData = {
            url: mockUrl,
            artifact: {
                primary: true,
                name: 'geotiff',
                modality: 'MAP_LAYER_GEOTIFF',
                tags: [],
                file_path: './',
                summary: 'test summary',
                description: 'test description',
                correlation_uuid: 'd4e5f6a1-1234-4b3a-af5d-8123456789ab',
                store_id: '6789de3f8-7404-4b3a-af5d-85292848235f.tiff',
                attachments: {}
            }
        }

        component.ngOnInit()
        await fixture.whenStable()
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(mapServiceSpy.addGeoTiffLayer).toHaveBeenCalledTimes(1)
        expect(mapServiceSpy.addGeoTiffLayer).toHaveBeenCalledWith(mockUrl, 'geotiff')
    })
})
