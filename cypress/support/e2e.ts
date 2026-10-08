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

Cypress.Commands.add('waitForAppStable', () => {
    cy.window({ log: false }).then({ timeout: 15000 }, win => {
        return new Cypress.Promise(resolve => {
            const testability = (win as any).getAllAngularTestabilities?.()[0]
            if (!testability) {
                resolve()
                return
            }

            const timeout = setTimeout(() => {
                resolve()
            }, 10000)

            testability.whenStable(() => {
                clearTimeout(timeout)
                resolve()
            })
        })
    })
})

Cypress.Commands.add('waitForRenderComplete', () => {
    cy.waitForAppStable()

    cy.window().then({ timeout: 15000 }, win => {
        return new Cypress.Promise(resolve => {
            const map = (win as any).map
            if (!map || typeof map.once !== 'function') {
                resolve()
                return
            }

            const timeout = setTimeout(() => {
                resolve()
            }, 10000)

            map.once('idle', () => {
                clearTimeout(timeout)
                resolve()
            })

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
