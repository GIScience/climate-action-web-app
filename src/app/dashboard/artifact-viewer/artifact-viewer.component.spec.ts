import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ArtifactService } from '../artifact/artifact.service'
import { ArtifactViewerComponent } from './artifact-viewer.component'

describe('ArtifactViewerComponent', () => {
    let component: ArtifactViewerComponent
    let fixture: ComponentFixture<ArtifactViewerComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ArtifactViewerComponent, HttpClientModule],
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

    it('should create a link and trigger a download when downloadContent is called', () => {
        const fakeAnchor = document.createElement('a')
        spyOn(fakeAnchor, 'click')
        const createElementSpy = spyOn(document, 'createElement').and.returnValue(fakeAnchor)
        const appendChildSpy = spyOn(document.body, 'appendChild').and.callFake(computation => computation)
        const removeChildSpy = spyOn(document.body, 'removeChild').and.callFake(computation => computation)
        component.artifactService.currentUrl = 'http://localhost:4200/dashboard/sample-image.png'
        component.downloadContent()

        expect(createElementSpy).toHaveBeenCalled()
        expect(createElementSpy).toHaveBeenCalledWith('a')
        expect(fakeAnchor.href).toBe('http://localhost:4200/dashboard/sample-image.png')
        expect(fakeAnchor.download).toBeTruthy()
        expect(fakeAnchor.click).toHaveBeenCalled()
        expect(appendChildSpy).toHaveBeenCalled()
        expect(removeChildSpy).toHaveBeenCalled()
    })
})
