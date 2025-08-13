import 'cypress-real-events'
import { addCompareSnapshotCommand } from 'cypress-visual-regression/dist/command'
import { cypressEnvironment } from './cypress-environment'

addCompareSnapshotCommand()

beforeEach(() => {
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
