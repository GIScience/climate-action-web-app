import {ComponentFixture, TestBed} from '@angular/core/testing'

import {ArtifactsComponent} from './artifacts.component'
import {HttpClientModule} from "@angular/common/http"

describe('ArtifactsComponent', () => {
    let component: ArtifactsComponent
    let fixture: ComponentFixture<ArtifactsComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                ArtifactsComponent,
                HttpClientModule
            ]
        })
        fixture = TestBed.createComponent(ArtifactsComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
