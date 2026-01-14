import {
    mockBlueprintTable,
    mockPluginBlueprint,
    mockPluginBlueprintComputation,
    mockPluginsList
} from '../support/interceptors'

describe('computations', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    const setupTest = () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockPluginBlueprintComputation()
        mockBlueprintTable()

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
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
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.wait('@getPluginBlueprintComputation')

        cy.get('.computations-index-content').should('exist')
    }

    it('should display the selected artifact even after a reload', () => {
        setupTest()

        cy.get('.parent-computation').eq(0).click()
        cy.get('.child-computation').eq(1).click()

        cy.wait('@getBlueprintTable')

        cy.reload(true)
        cy.get('.table-artifact-item').should('exist')
    })

    it('should display the detailed description for an artifact when available', () => {
        setupTest()

        cy.get('.parent-computation').eq(0).click()

        cy.get('.child-computation').eq(0).realHover()
        cy.get('.child-computation').eq(0).find('.description-btn').should('not.exist')

        cy.get('.child-computation').eq(1).realHover()
        cy.get('.child-computation').eq(1).find('.description-btn').click()

        cy.get('.description-dialog').should('exist')
        cy.get('.description-dialog').find('.markdown-artifact-item').should('contain', 'A table with two columns.')
    })

    it('should generate a share link', () => {
        setupTest()

        cy.get('.parent-computation').eq(0).realHover()
        cy.get('.parent-computation .computation-actions').find('button').first().click()

        // check content in clipboard
        cy.window().then(win => {
            win.navigator.clipboard.readText().then(text => {
                expect(text).to.eq(
                    'http://localhost:4200/dashboard/plugin/plugin_blueprint?share-id=8649e714-f29d-423f-85ce-cd55f4e5022a'
                )
            })
        })
    })

    it('should import a computation when visiting the share link', () => {
        setupTest()

        cy.window().then(win => {
            win.localStorage.clear()
        })

        cy.reload(true)

        cy.get('.parent-computation').should('not.exist')

        cy.visit(
            'http://localhost:4200/dashboard/plugin/plugin_blueprint?share-id=8649e714-f29d-423f-85ce-cd55f4e5022a'
        )

        cy.get('.parent-computation').should('exist').should('have.length', 1)
    })
})
