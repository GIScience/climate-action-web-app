import {
    mockPluginBluePrintIcon,
    mockPluginBlueprint404,
    mockPluginBlueprintComputation,
    mockPluginWalkabilitytIcon,
    mockPluginsList,
    mockPluginsListWithoutBlueprint
} from '../support/interceptors'

describe('pluginService', () => {
    it('fetch and display the plugin icon', () => {
        mockPluginsList()
        mockPluginBluePrintIcon()

        cy.visit('/')

        cy.wait('@getPlugins')
        cy.wait('@getPluginBlueprintIcon')

        expect(
            cy
                .get('.plugins-list .plugin-card')
                .first()
                .find('img')
                .should('have.attr', 'src')
                .and('not.include', 'fallback.jpg')
        )
    })

    it('should still display the plugin component if the plugin is offline, but a computation exists under it', () => {
        mockPluginsListWithoutBlueprint()
        mockPluginBlueprint404()
        mockPluginBlueprintComputation()
        mockPluginWalkabilitytIcon()

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
                        pluginId: 'plugin_blueprint',
                        pluginName: 'Plugin Blueprint',
                        timestamp: '2024-12-17T08:55:23.807074Z',
                        status: 'SUCCESS'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.visit('/')

        cy.wait('@getPluginsWithoutBlueprint')
        cy.wait('@getPluginWalkabiityIcon')

        cy.get('.plugin-card').eq(0).click()
        cy.wait('@getPluginBlueprint404')
        cy.wait('@getPluginBlueprintComputation')

        cy.get('.plugin-name-wrapper h1').should('exist').should('contain.text', 'Plugin Blueprint')
        cy.get('.parent-computation').eq(0).should('contain.text', '8649e714')
    })
})
