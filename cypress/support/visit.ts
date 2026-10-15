// Seeds the state the app reads on startup before the page loads, so a test needs a single visit
// instead of a landing visit, a reload to pick up the seeded state, and a second visit to the page
// under test. Runs live in IndexedDB (`cy.seedPluginRuns`), UI preferences in localStorage.
export const seedLocalStorage = () => (win: Window) => {
    win.localStorage.setItem('ui_prefs', JSON.stringify({ activeTab: 'bookmarks' }))
}

export const visitPluginPage = (pluginRuns?: object[]) => {
    if (pluginRuns) {
        cy.seedPluginRuns(pluginRuns)
    }

    cy.visit('dashboard/plugin/plugin_blueprint', { onBeforeLoad: seedLocalStorage() })

    cy.wait('@getPlugins')
    cy.wait('@getPluginBlueprint')
}
