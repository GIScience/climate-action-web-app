import 'cypress-real-events'
import { addCompareSnapshotCommand } from 'cypress-visual-regression/dist/command'
import { cypressEnvironment } from './cypress-environment'

addCompareSnapshotCommand()

beforeEach(() => {
    cy.intercept('**', req => {
        if (req.url.includes(`/${cypressEnvironment.apiBasePath}/`)) {
            req.reply({
                statusCode: 404,
                body: {
                    error: 'API call not mocked in Cypress test',
                    url: req.url,
                    method: req.method
                }
            })
        } else {
            req.continue()
        }
    }).as('blockUnmockedApiCalls')
})

Cypress.Commands.add('waitForRenderComplete', () => {
    cy.window().then(win => {
        return new Cypress.Promise(resolve => {
            const timeout = setTimeout(() => {
                resolve()
            }, 2500)

            win.olMap.once('rendercomplete', () => {
                clearTimeout(timeout)
                resolve()
            })
        })
    })
})
