declare namespace Cypress {
    interface Chainable {
        waitForRenderComplete(): Chainable<void>
    }
}
