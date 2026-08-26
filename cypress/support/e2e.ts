import 'cypress-fail-fast'
import 'cypress-file-upload'
import 'cypress-real-events'
import { addCompareSnapshotCommand } from 'cypress-visual-regression/dist/command'
import { cypressEnvironment } from './cypress-environment'

addCompareSnapshotCommand()

beforeEach(() => {
    cy.intercept(`${cypressEnvironment.cachetUrl}/**`, { body: { data: [], included: [] } }).as('blockCachetCalls')

    cy.intercept(`**/${cypressEnvironment.apiBasePath}/**`, {
        statusCode: 404,
        body: {
            error: 'API call not mocked in Cypress test'
        }
    }).as('blockUnmockedApiCalls')

    cy.intercept({ resourceType: /xhr|fetch/ }, { log: false })
})

Cypress.Commands.add('waitForRenderComplete', () => {
    cy.window().then(win => {
        return new Cypress.Promise(resolve => {
            const timeout = setTimeout(() => {
                resolve()
            }, 4000)

            const map = (win as any).map
            if (map && typeof map.once === 'function') {
                map.once('idle', () => {
                    clearTimeout(timeout)
                    resolve()
                })
            } else {
                clearTimeout(timeout)
                resolve()
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
