import {
    mockBlueprintTable,
    mockPluginBlueprint,
    mockPluginBlueprintComputation,
    mockPluginsList
} from '../support/interceptors'
import { visitPluginPage } from '../support/visit'

describe('computations', () => {
    const setupTest = () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockPluginBlueprintComputation()
        mockBlueprintTable()

        visitPluginPage([
            {
                aoiName: 'Test Area',
                correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
                flags: [],
                pluginId: 'plugin_blueprint',
                request_ts: '2024-12-17T08:55:23.807074Z',
                state: 'ACTIVE',
                status: 'SUCCESS'
            }
        ])

        cy.get('.computations-index-content').should('exist')
    }

    it('should display the selected artifact even after a reload', () => {
        setupTest()

        cy.get('.parent-computation').eq(0).click()

        cy.wait('@getPluginBlueprintComputation')

        cy.get('.child-computation').eq(1).click()

        cy.wait('@getBlueprintTable')

        cy.reload(true)
        cy.get('.table-artifact-item').should('exist')
    })

    it('should display the detailed description for an artifact when available', () => {
        setupTest()

        cy.get('.parent-computation').eq(0).click()

        cy.wait('@getPluginBlueprintComputation')

        cy.get('.child-computation').eq(0).realHover()
        cy.get('.child-computation').eq(0).find('.description-btn').should('not.exist')

        cy.get('.child-computation').eq(1).realHover()
        cy.get('.child-computation').eq(1).find('.description-btn').click()

        cy.get('.description-dialog').should('exist')
        cy.get('.description-dialog').find('.markdown-artifact-item').should('contain', 'A table with two columns.')
    })

    it('should generate a share link', () => {
        setupTest()

        cy.window().then(win => {
            cy.stub(win.navigator.clipboard, 'writeText').as('writeText')
        })

        cy.get('.parent-computation').eq(0).realHover()
        cy.get('button.share-trigger').click()

        cy.get('@writeText').should(
            'have.been.calledOnceWith',
            'http://localhost:4200/dashboard/plugin/plugin_blueprint/computation/8649e714-f29d-423f-85ce-cd55f4e5022a'
        )
    })

    it('should handle a legacy share link', () => {
        setupTest()

        cy.window().then(win => {
            win.localStorage.clear()
        })

        cy.reload(true)

        cy.get('.parent-computation').should('not.exist')

        cy.visit(
            'http://localhost:4200/dashboard/plugin/plugin_blueprint?share-id=8649e714-f29d-423f-85ce-cd55f4e5022a'
        )

        cy.get('.computation-detail').should('exist').should('have.length', 1)
    })
})
