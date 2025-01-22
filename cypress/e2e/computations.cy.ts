import {mockPluginsList, mockPluginBlueprint, mockPluginBlueprintComputation, mockMarkdown} from '../support/interceptors'

describe('computations', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    it('should display the selected artifact even after a reload', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockPluginBlueprintComputation()
        mockMarkdown()

        cy.window().then((win) => {
            win.localStorage.setItem('plugin_runs', JSON.stringify([{
                correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
                pluginId: 'plugin_blueprint',
                pluginName: 'Plugin Blueprint',
                timestamp: '2024-12-17T08:55:23.807074Z',
                status: 'SUCCESS'
            }]))
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.wait('@getPluginBlueprintComputation')

        cy.get('.computations-index-content').should('exist')

        cy.get('.parent-computation').eq(0).click()
        cy.get('.child-computation').eq(0).click()

        cy.wait('@getMarkdown')

        cy.reload(true)

        cy.get('.markdown-artifact-item').should('exist')
    })
})
