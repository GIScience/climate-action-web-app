import { HttpClientModule } from '@angular/common/http'
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { ArtifactComponent } from './artifact.component'
import { ArtifactService } from './artifact.service'
import { MarkdownComponent } from './markdown/markdown.component'

describe('ArtifactComponent', () => {
    let component: ArtifactComponent
    let fixture: ComponentFixture<ArtifactComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                ArtifactComponent,
                BrowserAnimationsModule,
                MarkdownComponent,
                TranslocoTestingModule.forRoot({ langs: { en: {}, de: {} }, translocoConfig: { defaultLang: 'en' } })
            ],
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
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            declarations: []
        })

        fixture = TestBed.createComponent(ArtifactComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should display the summary if present', () => {
        const testSummary = 'Test Summary'
        component.summary = testSummary
        fixture.detectChanges()

        const summaryElement = fixture.debugElement.query(By.css('.artifact-summary'))
        expect(summaryElement).toBeTruthy()
        expect(summaryElement.nativeElement.textContent).toContain(testSummary)
    })

    it('should display the description if present', async () => {
        const testDescription = 'Test Description'
        component.description = testDescription
        component.showAccordion = true
        fixture.detectChanges()

        const accordionHeader = fixture.debugElement.query(By.css('.mat-expansion-panel-header'))
        accordionHeader.nativeElement.click()
        fixture.detectChanges()
        await fixture.whenStable()

        const markdownContent = fixture.debugElement.query(By.css('.markdown-artifact-item'))
        expect(markdownContent).toBeTruthy()
        expect(markdownContent.nativeElement.textContent).toContain(testDescription)
    })
})
