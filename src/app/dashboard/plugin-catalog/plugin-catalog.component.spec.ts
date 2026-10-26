import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { environment } from '@environments/environment'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { getTranslocoTestingModule } from '../../../../jest.mocks'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { MapArtifactManagerService } from '../map/map-artifact-manager.service'
import { MapService } from '../map/map.service'
import { PluginCatalogComponent } from './plugin-catalog.component'

const PLUGINS = ['Alpha', 'Bravo', 'Charlie'].map(name => ({
    id: name.toLowerCase(),
    name,
    library_version: '1.0.0',
    version: '1.0.0',
    teaser: `${name} teaser`,
    concerns: ['ghg_emission'],
    online: true
}))

describe('PluginCatalogComponent', () => {
    let component: PluginCatalogComponent
    let fixture: ComponentFixture<PluginCatalogComponent>
    let httpMock: HttpTestingController

    const createComponent = (mode: 'deck' | 'inline') => {
        fixture = TestBed.createComponent(PluginCatalogComponent)
        component = fixture.componentInstance
        fixture.componentRef.setInput('mode', mode)
        fixture.detectChanges()

        const req = httpMock.expectOne(
            request =>
                request.url === `${environment.climateActionApiUrl}/plugin` && request.params.get('lang') === 'en'
        )
        req.flush(PLUGINS)
        fixture.detectChanges()
    }

    const tiles = () => Array.from(document.querySelectorAll<HTMLButtonElement>('button.plugin-card'))

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, PluginCatalogComponent, getTranslocoTestingModule()],
            providers: [
                { provide: MapService, useValue: { removeFocusedLayer: jest.fn(), removeComputeLayers: jest.fn() } },
                { provide: ArtifactViewerService, useValue: { closeArtifactViewer: jest.fn() } },
                { provide: MapArtifactManagerService, useValue: { clearTransientArtifacts: jest.fn() } },
                provideTippyLoader(() => import('tippy.js')),
                provideTippyConfig({
                    defaultVariation: 'tooltip',
                    variations: {
                        tooltip: tooltipVariation,
                        popper: popperVariation
                    }
                })
            ]
        })
        httpMock = TestBed.inject(HttpTestingController)
    })

    afterEach(() => {
        httpMock.verify()
    })

    it('renders a tile per plugin when inline', () => {
        createComponent('inline')

        expect(tiles().map(tile => tile.textContent?.trim())).toEqual(['Alpha', 'Bravo', 'Charlie'])
    })

    it('opens the grid from the deck, and closes it when a plugin is picked', () => {
        createComponent('deck')
        const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
        expect(tiles()).toHaveLength(0)

        fixture.nativeElement.querySelector('button.deck').click()
        fixture.detectChanges()
        fixture.detectChanges()
        expect(tiles()).toHaveLength(3)

        tiles()[1].click()
        fixture.detectChanges()

        expect(component.open).toBe(false)
        expect(tiles()).toHaveLength(0)
        expect(navigate).toHaveBeenCalledWith(['dashboard', 'plugin', 'bravo'])
    })
})
