import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MapService } from '@app/dashboard/map/map.service'
import { jest } from '@jest/globals'
import * as maplibregl from 'maplibre-gl'
import { RasterComponent } from './raster.component'

describe('RasterComponent', () => {
    let component: RasterComponent
    let fixture: ComponentFixture<RasterComponent>
    let mapServiceSpy: jest.Mocked<MapService>

    beforeEach(async () => {
        mapServiceSpy = {
            addRasterLayer: jest.fn()
        } as unknown as jest.Mocked<MapService>

        await TestBed.configureTestingModule({
            imports: [RasterComponent, HttpClientModule],
            providers: [{ provide: MapService, useValue: mapServiceSpy }]
        }).compileComponents()

        fixture = TestBed.createComponent(RasterComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should fail to initialize map when input data is missing', () => {
        component.inputData = undefined
        component.ngOnInit()
        expect(mapServiceSpy.addRasterLayer).not.toHaveBeenCalled()
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

        mapServiceSpy.addRasterLayer.mockResolvedValue(mockLayer)

        component.inputData = {
            url: mockUrl,
            artifact: {
                primary: true,
                name: 'raster',
                modality: 'RASTER_MAP_LAYER',
                tags: [],
                summary: 'test summary',
                description: 'test description',
                correlation_uuid: 'd4e5f6a1-1234-4b3a-af5d-8123456789ab',
                filename: '6789de3f8-7404-4b3a-af5d-85292848235f.tiff',
                attachments: {
                    display_filename: 'raster_layer.tiff'
                },
                sources: [],
                rank: 0
            }
        }

        component.ngOnInit()
        await fixture.whenStable()
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(mapServiceSpy.addRasterLayer).toHaveBeenCalledTimes(1)
        expect(mapServiceSpy.addRasterLayer).toHaveBeenCalledWith(mockUrl, 'raster')
    })
})
