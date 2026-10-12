// Seeds local storage while the page loads, so a test needs a single visit instead of a landing
// visit, a reload to pick up the seeded state, and a second visit to the page under test.
export const seedLocalStorage = (pluginRuns?: object[]) => (win: Window) => {
    win.localStorage.setItem('ui_prefs', JSON.stringify({ activeTab: 'bookmarks' }))
    if (pluginRuns) {
        win.localStorage.setItem('plugin_runs', JSON.stringify(pluginRuns))
    }
}

export const visitPluginPage = (pluginRuns?: object[]) => {
    cy.visit('dashboard/plugin/plugin_blueprint', { onBeforeLoad: seedLocalStorage(pluginRuns) })

    cy.wait('@getPlugins')
    cy.wait('@getPluginBlueprint')
}
