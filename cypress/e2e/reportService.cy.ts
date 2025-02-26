import {
    mockBlueprintTable,
    mockPluginBlueprint,
    mockPluginBlueprintComputation,
    mockPluginsList
} from '../support/interceptors'

describe('report builder', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    it('the report builder should work correctly', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockPluginBlueprintComputation()
        mockBlueprintTable()

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

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.wait('@getPluginBlueprintComputation')

        cy.get('.computations-index-content').should('exist')

        cy.get('.parent-computation').eq(0).click()

        cy.get('.child-computation').eq(0).realHover()
        cy.get('.child-computation').eq(0).find('.add-to-report-btn').click()

        cy.get('.child-computation').eq(1).realHover()
        cy.get('.child-computation').eq(1).find('.add-to-report-btn').click()

        cy.get('.left-column-collapser').click()

        cy.get('.report-item').should('exist').should('have.length', 2)

        cy.get('.report-item').eq(0).find('.report-item-header').should('contain', 'A Text')

        cy.get('.report-item').eq(1).find('.remove-btn').click()

        cy.get('.report-item').should('exist').should('have.length', 1)

        cy.get('.report-controls').find('button').last().click()

        cy.get('.report-item').should('not.exist')

        cy.get('.report-header').find('.close-btn').click()

        cy.get('.report-window').should('not.exist')
    })
})
