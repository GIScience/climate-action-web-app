import {mockPluginsList, mockPluginBluePrintIcon, mockPluginWalkabilitytIcon} from '../support/interceptors'

describe('pluginService', () => {

    it('fetch and display the plugin icon', () => {
        mockPluginsList()
        mockPluginBluePrintIcon()

        cy.visit('/')

        cy.wait('@getPlugins')
        cy.wait('@getPluginBlueprintIcon')

        expect(cy.get('.plugins-list .plugin-card').first().find('img').should('have.attr', 'src').and('not.include', 'fallback.jpg'))
    })

    it('overwrite the default plugin icon when available', () => {
        mockPluginsList()
        mockPluginBluePrintIcon()
        mockPluginWalkabilitytIcon()

        cy.visit('/')

        cy.wait('@getPlugins')
        cy.wait('@getPluginBlueprintIcon')
        cy.wait('@getPluginWalkabiityIcon')

        expect(cy.get('.plugins-list .plugin-card').eq(2).find('img').should('have.attr', 'src').and('not.include', 'assets/images/plugin-icons/walkability.jpg'))
    })
})
