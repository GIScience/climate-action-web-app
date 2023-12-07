import {ComponentFixture, TestBed} from '@angular/core/testing'

import {GeojsonComponent} from './geojson.component'
import {HttpClient, HttpClientModule} from '@angular/common/http'
import {of} from 'rxjs'
import SpyObj = jasmine.SpyObj;

describe('GeojsonComponent', () => {
    let component: GeojsonComponent
    let fixture: ComponentFixture<GeojsonComponent>
    let httpClientSpy: SpyObj<HttpClient>


    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['post', 'get'])

        TestBed.configureTestingModule({
            imports: [GeojsonComponent, HttpClientModule],
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpClientSpy
                }
            ]
        });
        fixture = TestBed.createComponent(GeojsonComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should fail rendering geojson when store id is malformed', () => {
        component.inputData = {
            url: 'http://test_url',
            artifact: {
                name: 'geojson',
                modality: 'MAP_LAYER_GEOJSON',
                file_path: './',
                summary: 'test summary',
                description: 'test description',
                correlation_uuid: '6b6ea4ba-7c0c-4e5d-a2ee-0f32a743f88e',
                params: {},
                store_id: '606de3f8-7404-4b3a-af5d-85292848235f'
            }
        }
        component.ngOnInit()
        expect(component.mapDivID).toEqual('')
    });

    it('should render geojson', () => {
        httpClientSpy.get.and.returnValue(of({
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry': {'type': 'Point', 'coordinates': [102.0, 0.5]},
                    'properties': {'prop0': 'value0'}
                },
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': [
                            [102.0, 0.0], [103.0, 1.0], [104.0, 0.0], [105.0, 1.0]
                        ]
                    },
                    'properties': {
                        'prop0': 'value0',
                        'prop1': 0.0
                    }
                },
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Polygon',
                        'coordinates': [
                            [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
                                [100.0, 1.0], [100.0, 0.0]]
                        ]

                    },
                    'properties': {
                        'prop0': 'value0',
                        'prop1': {'this': 'that'}
                    }
                }
            ]
        }))

        expect(component.geojsonLayer).toBeFalsy()

        component.inputData = {
            url: 'http://test_url',
            artifact: {
                name: 'geojson',
                modality: 'MAP_LAYER_GEOJSON',
                file_path: './',
                summary: 'test summary',
                description: 'test description',
                correlation_uuid: '6b6ea4ba-7c0c-4e5d-a2ee-0f32a743f88e',
                params: {},
                store_id: '606de3f8-7404-4b3a-af5d-85292848235f.geojson'
            }
        }
        component.ngOnInit()
        expect(component.mapDivID).not.toEqual('')
        component.ngAfterViewInit()
        fixture.detectChanges()

        expect(component.geojsonLayer).toBeTruthy()
    });
})
