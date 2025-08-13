declare namespace Cypress {
    interface Chainable {
        waitForRenderComplete(): Chainable<void>
        clickFakeUserButtonUntilGone(): Chainable<void>
    }
}
