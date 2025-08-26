import {
    mockComputationRunState,
    mockPluginHiWalk,
    mockPluginHiWalkComputation,
    mockPluginsList,
    mockPostPluginRun
} from '../support/interceptors'

describe('walkthrough', () => {
    it('should run the walkthrough', () => {
        mockPluginsList()
        mockPluginHiWalk()
        mockComputationRunState()
        mockPostPluginRun()
        mockPluginHiWalkComputation()

        cy.visit('/')

        cy.wait('@getPlugins')

        cy.wait(1000)

        cy.clickFakeUserButtonUntilGone()

        cy.get('.welcome-content .cta-section .btn-primary').click()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '1 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.wait('@getPluginHiWalk')

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '2 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '3 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.waitForRenderComplete()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '4 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '5 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.wait('@postPluginRun', { timeout: 30000, requestTimeout: 30000 }).wait(1000)

        cy.wait('@getComputationRunState')

        cy.wait('@getPluginHiWalkComputation')

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '6 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '7 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '8 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '9 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '10 of 10')

        cy.get('.driver-popover-title').should('have.text', 'Done!')
    })
})
