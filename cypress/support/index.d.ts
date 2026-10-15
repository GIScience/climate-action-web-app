declare namespace Cypress {
    interface Chainable {
        waitForRenderComplete(): Chainable<void>
        clickFakeUserButtonUntilGone(): Chainable<void>
        seedPluginRuns(runs: object[]): Chainable<void>
    }
}
