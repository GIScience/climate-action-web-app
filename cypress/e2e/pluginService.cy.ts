import {mockPluginsList, mockPluginIcon} from '../support/interceptors'

describe('pluginService', () => {

    it('display the layerswitcher', () => {
        mockPluginsList()
        mockPluginIcon()

        cy.visit('/')

        cy.wait('@getPlugins')
        cy.wait('@getPluginIcon')

        expect(cy.get('.plugins-list .plugin-card').first().find('img').should('have.attr', 'src').and('not.include', 'fallback.jpg'))
    })
})
