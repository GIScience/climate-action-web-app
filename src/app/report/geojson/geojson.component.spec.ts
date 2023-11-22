import {ComponentFixture, TestBed} from '@angular/core/testing';

import {GeojsonComponent} from './geojson.component';
import {HttpClientModule} from "@angular/common/http";

describe('GeojsonComponent', () => {
    let component: GeojsonComponent;
    let fixture: ComponentFixture<GeojsonComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [GeojsonComponent, HttpClientModule]
        });
        fixture = TestBed.createComponent(GeojsonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
