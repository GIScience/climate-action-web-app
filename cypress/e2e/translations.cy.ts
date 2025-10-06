import { mockPluginBlueprint, mockPluginsList } from '../support/interceptors'

describe('translations', () => {
    beforeEach(() => {
        mockPluginsList()
        mockPluginBlueprint()
    })

    it('load the correct translation based on the browser language', () => {
        cy.visit('/', {
            onBeforeLoad(win: Cypress.AUTWindow) {
                Object.defineProperty(win.navigator, 'language', { value: 'de-DE' })
            }
        })

        cy.get('.notes-section h3').should('have.text', 'Bevor du beginnst ein paar Hinweise:')
    })

    it('prefer the local storage language if present and load it', () => {
        cy.window().then(win => {
            win.localStorage.setItem('language_pref', '"en"')
        })

        cy.reload(true)

        cy.visit('/', {
            onBeforeLoad(win: Cypress.AUTWindow) {
                Object.defineProperty(win.navigator, 'language', { value: 'de-DE' })
            }
        })

        cy.get('.intro-section h1').should('have.text', 'Welcome to the Climate Action Navigator (CAN)')
    })

    it('should switch the language dynamically when selected through the language menu', () => {
        cy.visit('/', {
            onBeforeLoad(win: Cypress.AUTWindow) {
                Object.defineProperty(win.navigator, 'language', { value: 'en-US' })
            }
        })

        cy.get('button.language-button').click()
        cy.get('button.language-menu__item').eq(1).should('contain.text', 'DE - Deutsch').click()

        cy.get('.plugins-list .plugin-card').eq(0).click()

        cy.get('.computations-list__header h2').should('have.text', 'Ergebnisse')
    })
})
