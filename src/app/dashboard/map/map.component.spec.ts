import { ComponentFixture, TestBed } from '@angular/core/testing'
import { jest } from '@jest/globals'
import { MapComponent } from './map.component'
import { MapService } from './map.service'

describe('MapComponent', () => {
    let component: MapComponent
    let fixture: ComponentFixture<MapComponent>
    let mockMapService: jest.Mocked<MapService>

    beforeEach(async () => {
        mockMapService = {
            initMap: jest.fn()
        } as unknown as jest.Mocked<MapService>

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
