import {
    interceptWalkthroughORS,
    mockComputationRunState,
    mockPluginHiWalk,
    mockPluginHiWalkComputation,
    mockPluginsList,
    mockPostPluginRun,
    mockRegionSelection
} from '../support/interceptors'

describe('walkthrough', () => {
    it('should run the walkthrough', () => {
        mockPluginsList()
        mockPluginHiWalk()
        mockComputationRunState()
        mockPostPluginRun()
        mockPluginHiWalkComputation()
        interceptWalkthroughORS()
        mockRegionSelection('ventotene_ogc_wfs.geojson')

        cy.visit('/')

        cy.wait('@getPlugins')

        cy.clickFakeUserButtonUntilGone()

        cy.get('.welcome-content .cta-tour').click()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '1 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.wait('@getPluginHiWalk')

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '2 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.wait('@openRouteServiceWalkthroughRequest')

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '3 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.waitForRenderComplete()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '4 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '5 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.wait('@postPluginRun', { timeout: 30000, requestTimeout: 30000 }).wait(1000)

        cy.wait('@getComputationRunState')

        cy.get('.driver-popover-progress-text').invoke('text').should('eq', '6 of 10')

        cy.get('.driver-popover-next-btn').click()

        cy.wait('@getPluginHiWalkComputation')

        cy.waitForRenderComplete()

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
