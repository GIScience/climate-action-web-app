import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PluginParameterComponent } from './plugin-parameter.component';

describe('PluginParameterComponent', () => {
  let component: PluginParameterComponent;
  let fixture: ComponentFixture<PluginParameterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PluginParameterComponent]
    });
    fixture = TestBed.createComponent(PluginParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
