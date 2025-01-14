import {mockPluginsList, mockPluginBlueprint, mockPluginBlueprintComputation, mockMarkdown} from '../support/interceptors'

describe('artifacts', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    it('should display the selected report item even after a reload', () => {
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

        cy.get('.artifact-tree-content').should('exist')

        cy.get('.artifact-parent-computation').eq(0).click()
        cy.get('.artifact-child-computation').eq(0).click()

        cy.wait('@getMarkdown')

        cy.reload(true)

        cy.get('.markdown-report-item').should('exist')
    })
})
