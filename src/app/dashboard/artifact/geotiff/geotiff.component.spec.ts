import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import TileLayer from 'ol/layer/WebGLTile.js'
import { XYZ } from 'ol/source'
import { MapService } from '../../map/map.service'
import { GeoTiffComponent } from './geotiff.component'
import SpyObj = jasmine.SpyObj

describe('GeoTiffComponent', () => {
    let component: GeoTiffComponent
    let fixture: ComponentFixture<GeoTiffComponent>
    let mapServiceSpy: SpyObj<MapService>

    beforeEach(async () => {
        mapServiceSpy = jasmine.createSpyObj<MapService>('MapService', ['addGeoTiffLayer'])

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
        const mockSource: XYZ = new XYZ()
        const mockLayer = new TileLayer({ source: mockSource })

        mapServiceSpy.addGeoTiffLayer.and.returnValue(Promise.resolve(mockLayer))

        component.inputData = {
            url: mockUrl,
            artifact: {
                primary: true,
                name: 'geotiff',
                modality: 'MAP_LAYER_GEOTIFF',
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

        const addGeoTiffLayerCalls = mapServiceSpy.addGeoTiffLayer.calls.all()

        expect(addGeoTiffLayerCalls.length).toBeGreaterThan(0)
        expect(mapServiceSpy.addGeoTiffLayer).toHaveBeenCalledWith(mockUrl, 'geotiff')
    })
})
