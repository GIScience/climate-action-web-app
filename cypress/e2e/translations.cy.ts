import { mockPluginBlueprint, mockPluginBlueprintGerman, mockPluginsList } from '../support/interceptors'

describe('translations', () => {
    beforeEach(() => {
        mockPluginsList()
        mockPluginBlueprint()
        mockPluginBlueprintGerman()
    })

    it('load the correct translation based on the browser language', () => {
        cy.visit('/', {
            onBeforeLoad(win: Cypress.AUTWindow) {
                Object.defineProperty(win.navigator, 'language', { value: 'de-DE' })
            }
        })

        cy.get('.notes-section h2').should('have.text', 'Bevor du beginnst ein paar Hinweise…')
    })

    it('prefer the local storage language if present and load it', () => {
        cy.visit('/', {
            onBeforeLoad(win: Cypress.AUTWindow) {
                win.localStorage.setItem('language_pref', '"en"')
                Object.defineProperty(win.navigator, 'language', { value: 'de-DE' })
            }
        })

        cy.get('.intro-section h1').should('have.text', 'See where your city should focus its climate action')
    })

    it('should switch the language dynamically when selected through the language menu', () => {
        cy.visit('/', {
            onBeforeLoad(win: Cypress.AUTWindow) {
                Object.defineProperty(win.navigator, 'language', { value: 'en-US' })
            }
        })

        cy.wait('@getPlugins')

        cy.get('button.language-button').click()
        cy.get('button.language-menu__item').eq(1).should('contain.text', 'DE - Deutsch').click()

        cy.get('.plugins-list .plugin-card').eq(1).click()

        cy.wait('@getPluginBlueprintGerman')

        cy.get('.computations-list__header h2').should('have.text', 'Ergebnisse')
    })
})
