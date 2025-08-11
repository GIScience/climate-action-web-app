import {
    mockComputationState,
    mockPluginHiWalk,
    mockPluginHiWalkComputation,
    mockPluginsList,
    mockPostPluginRun
} from '../support/interceptors'

describe('walkthrough', () => {
    it('should run the walkthrough', () => {
        mockPluginsList()
        mockPluginHiWalk()
        mockComputationState()
        mockPostPluginRun()
        mockPluginHiWalkComputation()

        cy.visit('/')

        cy.wait('@getPlugins')

        cy.get('button.fake-user-button').click().wait(1000)

        cy.get('.welcome-content .cta-section .btn-primary').click().wait(1000)

        cy.get('.driver-popover-next-btn').click().wait(1000)

        cy.wait('@getPluginHiWalk')

        cy.get('.driver-popover-next-btn').click().wait(1000)

        cy.get('.driver-popover-next-btn').click().wait(1000)

        cy.get('.driver-popover-next-btn').click().wait(1000)

        cy.get('.driver-popover-next-btn').click()

        cy.wait(2000)

        cy.wait('@postPluginRun', { timeout: 30000, requestTimeout: 30000 }).wait(1000)

        cy.wait('@getComputationState')

        cy.wait('@getPluginHiWalkComputation')

        cy.get('.driver-popover-next-btn').click().wait(1000)

        cy.get('.driver-popover-next-btn').click().wait(1000)

        cy.get('.driver-popover-next-btn').click().wait(1000)

        cy.get('.driver-popover-next-btn').click().wait(1000)

        cy.get('.driver-popover-title').should('have.text', 'Done!')
    })
})
