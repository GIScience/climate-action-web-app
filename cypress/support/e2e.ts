import 'cypress-fail-fast'
import 'cypress-file-upload'
import 'cypress-real-events'
import { addCompareSnapshotCommand } from 'cypress-visual-regression/dist/command'
import { cypressEnvironment } from './cypress-environment'
import { stubMapNetwork } from './interceptors'

addCompareSnapshotCommand()

beforeEach(() => {
    cy.intercept(`${cypressEnvironment.cachetUrl}/**`, { body: { data: [], included: [] } }).as('blockCachetCalls')

    cy.intercept('**/v1/account', {
        statusCode: 401,
        body: { message: 'User (role: guests) missing scope (account)', code: 401, type: 'general_unauthorized_scope' }
    }).as('blockAppwriteSessionCheck')

    cy.intercept(`**/${cypressEnvironment.apiBasePath}/**`, {
        statusCode: 404,
        body: {
            error: 'API call not mocked in Cypress test'
        }
    }).as('blockUnmockedApiCalls')

    stubMapNetwork()

    // Keep this one last: it only switches logging off and passes requests on to the stubs above.
    cy.intercept({ resourceType: /xhr|fetch/ }, { log: false })
})

Cypress.Commands.add('waitForRenderComplete', () => {
    cy.window({ log: false, timeout: 15000 }).should('have.property', 'map')

    cy.window().then({ timeout: 15000 }, win => {
        return new Cypress.Promise(resolve => {
            const map = (win as any).map

            const timeout = setTimeout(() => {
                resolve()
            }, 10000)

            map.once('idle', () => {
                clearTimeout(timeout)
                resolve()
            })

            // An already-idle map never emits 'idle' again on its own; force one frame so it does.
            if (typeof map.triggerRepaint === 'function') {
                map.triggerRepaint()
            }
        })
    })
})

Cypress.Commands.add('clickFakeUserButtonUntilGone', () => {
    cy.get('body').then($body => {
        if ($body.find('button.fake-user-button').length > 0) {
            cy.get('button.fake-user-button').click({ force: true })
            cy.wait(1000)
            cy.get('body').then($bodyAfter => {
                if ($bodyAfter.find('button.fake-user-button').length > 0) {
                    cy.wait(1000)
                    cy.clickFakeUserButtonUntilGone()
                }
            })
        }
    })
})
