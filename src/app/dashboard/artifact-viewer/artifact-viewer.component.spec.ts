import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { getTranslocoTestingModule } from '../../../../jest.mocks'
import { ArtifactService } from '../artifact/artifact.service'
import { ArtifactViewerComponent } from './artifact-viewer.component'

describe('ArtifactViewerComponent', () => {
    let component: ArtifactViewerComponent
    let fixture: ComponentFixture<ArtifactViewerComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ArtifactViewerComponent, HttpClientModule, getTranslocoTestingModule()],
            providers: [
                ArtifactService,
                provideTippyLoader(() => import('tippy.js')),
                provideTippyConfig({
                    defaultVariation: 'tooltip',
                    variations: {
                        tooltip: tooltipVariation,
                        popper: popperVariation
                    }
                })
            ]
        }).compileComponents()

        fixture = TestBed.createComponent(ArtifactViewerComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should display the name if present', () => {
        const testName = 'Test Name'
        component.artifactViewerService.setName(testName)
        fixture.detectChanges()

        const nameElement = fixture.debugElement.query(By.css('.artifact-name'))
        expect(nameElement).toBeTruthy()
        expect(nameElement.nativeElement.textContent).toContain(testName)
    })
})
