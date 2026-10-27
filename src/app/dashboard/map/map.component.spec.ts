import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Mocked } from 'vitest'
import { MapComponent } from './map.component'
import { MapService } from './map.service'

describe('MapComponent', () => {
    let component: MapComponent
    let fixture: ComponentFixture<MapComponent>
    let mockMapService: Mocked<MapService>

    beforeEach(async () => {
        mockMapService = {
            initMap: vi.fn<MapService['initMap']>().mockResolvedValue(undefined)
        } as unknown as Mocked<MapService>

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
