import {
    mockPluginBluePrintIcon,
    mockPluginBlueprint,
    mockPluginBlueprintComputation,
    mockPluginBlueprintOffline,
    mockPluginWalkabilitytIcon,
    mockPluginsList,
    mockPluginsListWithoutBlueprint
} from '../support/interceptors'

describe('pluginService', () => {
    it('fetch and display the plugin icon', () => {
        mockPluginsList()
        mockPluginBluePrintIcon()
        mockPluginWalkabilitytIcon()

        cy.visit('/')

        cy.wait('@getPlugins')
        cy.wait('@getPluginBlueprintIcon')
        cy.wait('@getPluginWalkabilityIcon')

        expect(
            cy
                .get('.plugins-list .plugin-card')
                .first()
                .find('img')
                .should('have.attr', 'src')
                .and('not.include', 'fallback.jpg')
        )
    })

    it('read and render the operator schema correctly', () => {
        mockPluginsList()
        mockPluginBlueprint()

        cy.visit('/')

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.clickFakeUserButtonUntilGone()

        cy.wait(500)

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

    it('should still display the plugin component even if the plugin is offline', () => {
        mockPluginsListWithoutBlueprint()
        mockPluginWalkabilitytIcon()
        mockPluginBluePrintIcon()
        mockPluginBlueprintOffline()
        mockPluginBlueprintComputation()

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
                        pluginId: 'plugin_blueprint',
                        pluginName: 'Plugin Blueprint',
                        request_ts: '2024-12-17T08:55:23.807074Z',
                        status: 'SUCCESS'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.visit('/')

        cy.wait('@getPluginsWithoutBlueprint')
        cy.wait('@getPluginWalkabilityIcon')
        cy.wait('@getPluginBlueprintIcon')

        cy.get('.plugin-card').eq(1).click()
        cy.wait('@getPluginBlueprintOffline')
        cy.wait('@getPluginBlueprintComputation')

        cy.get('.plugin-header h1').should('exist').should('contain.text', 'Plugin Blueprint')
        cy.get('.parent-computation').eq(0).should('contain.text', '8649e714')
    })
})
