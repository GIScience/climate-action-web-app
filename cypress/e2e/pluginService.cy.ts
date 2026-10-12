import {
    mockPluginBluePrintIcon,
    mockPluginBlueprint,
    mockPluginBlueprintComputation,
    mockPluginBlueprintOffline,
    mockPluginShowcaseWithConstraints,
    mockPluginWalkabilitytIcon,
    mockPluginsList,
    mockPluginsListWithoutBlueprint,
    mockRegionSelection
} from '../support/interceptors'
import { seedLocalStorage, visitPluginPage } from '../support/visit'

describe('pluginService', () => {
    it('fetch and display the plugin icon', () => {
        mockPluginsList()
        mockPluginBluePrintIcon()
        mockPluginWalkabilitytIcon()

        cy.visit('/')

        cy.wait('@getPlugins')
        cy.wait('@getPluginBlueprintIcon')
        cy.wait('@getPluginWalkabilityIcon')

        cy.get('.plugins-list .plugin-card')
            .first()
            .find('img')
            .should('have.attr', 'src')
            .and('not.include', 'fallback.jpg')
    })

    it('read and render the operator schema correctly', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockRegionSelection('baden-wuerttemberg_ogc_wfs.geojson')

        visitPluginPage()

        cy.clickFakeUserButtonUntilGone()

        cy.get('button.new-compute').click()

        cy.get('.maplibregl-ctrl-zoom-in').click()
        cy.get('.maplibregl-ctrl-zoom-in').click()
        cy.get('.maplibregl-ctrl-zoom-in').click()

        cy.waitForRenderComplete()

        cy.get('canvas.maplibregl-canvas').click(1000, 300)

        cy.get('formly-form label.mdc-label').should('contain.text', 'Boolean Input')

        cy.get('button.optional-attributes-button').click()

        cy.get('.dialog-window input[type="number"]').should('exist')
    })

    it('read and validate the AoI constraints correctly', () => {
        mockPluginsList()
        mockPluginShowcaseWithConstraints()
        mockRegionSelection('baden-wuerttemberg_ogc_wfs.geojson')

        cy.visit('dashboard/plugin/plugin_showcase', { onBeforeLoad: seedLocalStorage() })

        cy.wait('@getPlugins')
        cy.wait('@getPluginShowcaseWithConstraints')

        cy.clickFakeUserButtonUntilGone()

        cy.get('button.new-compute').click()

        cy.get('.constraint-note').should('exist')

        cy.get('.area-selection-buttons .draw-button').first().click()

        cy.get('.maplibregl-ctrl-zoom-in').click()
        cy.get('.maplibregl-ctrl-zoom-in').click()
        cy.get('.maplibregl-ctrl-zoom-in').click()

        cy.waitForRenderComplete()

        cy.get('canvas.maplibregl-canvas').click(1000, 300)

        cy.get('.area-selection-message').should('have.class', 'message--blocked')

        cy.get('button[type="submit"]').should('be.disabled')
    })

    it('should still display the plugin component even if the plugin is offline', () => {
        mockPluginsListWithoutBlueprint()
        mockPluginWalkabilitytIcon()
        mockPluginBluePrintIcon()
        mockPluginBlueprintOffline()
        mockPluginBlueprintComputation()

        cy.visit('/', {
            onBeforeLoad: seedLocalStorage([
                {
                    correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
                    pluginId: 'plugin_blueprint',
                    request_ts: '2024-12-17T08:55:23.807074Z',
                    status: 'SUCCESS',
                    aoiName: 'Heidelberg',
                    flags: [],
                    state: 'ACTIVE'
                }
            ])
        })

        cy.wait('@getPluginsWithoutBlueprint')
        cy.wait('@getPluginWalkabilityIcon')
        cy.wait('@getPluginBlueprintIcon')

        cy.get('.plugin-card').eq(1).click()
        cy.wait('@getPluginBlueprintOffline')

        cy.get('.plugin-header h1').should('exist').should('contain.text', 'Plugin Blueprint')
        cy.get('.parent-computation').eq(0).should('contain.text', '8649e714')
    })
})
