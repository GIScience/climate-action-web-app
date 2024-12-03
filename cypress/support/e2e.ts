import {addCompareSnapshotCommand} from 'cypress-visual-regression/dist/command'

addCompareSnapshotCommand()

Cypress.Commands.add('waitForRenderComplete', () => {
    cy.window().then((win) => {
        return new Cypress.Promise((resolve) => {
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
