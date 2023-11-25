import {ComponentFixture, TestBed} from '@angular/core/testing'

import {GeoTiffComponent} from './geotiff.component'
import {HttpClientModule} from "@angular/common/http"

describe('GeotiffComponent', () => {
    let component: GeoTiffComponent
    let fixture: ComponentFixture<GeoTiffComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [GeoTiffComponent, HttpClientModule]
        })
        fixture = TestBed.createComponent(GeoTiffComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
