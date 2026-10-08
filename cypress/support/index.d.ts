declare namespace Cypress {
    interface Chainable {
        waitForAppStable(): Chainable<void>
        waitForRenderComplete(): Chainable<void>
        clickFakeUserButtonUntilGone(): Chainable<void>
    }
}
