import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeotiffComponent } from './geotiff.component';

describe('GeotiffComponent', () => {
  let component: GeotiffComponent;
  let fixture: ComponentFixture<GeotiffComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GeotiffComponent]
    });
    fixture = TestBed.createComponent(GeotiffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
