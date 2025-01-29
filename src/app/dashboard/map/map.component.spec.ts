import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MapComponent } from './map.component'
import { MapService } from './map.service'

describe('MapComponent', () => {
    let component: MapComponent
    let fixture: ComponentFixture<MapComponent>
    let mockMapService: jasmine.SpyObj<MapService>

    beforeEach(async () => {
        mockMapService = jasmine.createSpyObj<MapService>('MapService', ['initMap'])

        await TestBed.configureTestingModule({
            imports: [MapComponent],
            providers: [{ provide: MapService, useValue: mockMapService }]
        }).compileComponents()

        fixture = TestBed.createComponent(MapComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
