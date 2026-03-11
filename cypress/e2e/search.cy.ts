import { interceptSearchORS } from '../support/interceptors'

describe('Search', () => {
    beforeEach(() => {
        interceptSearchORS()
        cy.visit('dashboard/plugin/plugin_blueprint')
    })

    it('should list suggestions when given a location', () => {
        cy.get('.search-locations').type('Berlin')
        cy.wait('@openRouteServiceSearchRequest')
        cy.get('.location-suggestion__item')
            .should('have.length.gte', 1)
            .each(item => {
                cy.wrap(item).within(() => {
                    cy.get('.suggestion__title, .suggestion__subtitle').should('contain.text', 'Berlin')
                })
            })
    })

    it('should add a marker when hovering over a suggestion', () => {
        cy.get('.search-locations').type('Berlin')
        cy.wait('@openRouteServiceSearchRequest')
        cy.get('.location-suggestion__item').first().trigger('mouseover')

        cy.get('.maplibregl-canvas')
            .should('be.visible')
            .then(() => {
                cy.window().then(win => {
                    expect(win.map).to.exist

                    cy.get('.marker').should('exist')
                    cy.get('.marker').should('have.css', 'background-image').and('include', 'map-pin.svg')
                })
            })
    })

    it('should add a marker when clicking on a suggestion and change the map center', () => {
        cy.get('.search-locations').type('Berlin')
        cy.wait('@openRouteServiceSearchRequest')
        let initialCenter
        cy.window().then(win => {
            expect(win.map).to.exist
            initialCenter = win.map.getCenter()
        })

        cy.get('.location-suggestion__item').first().click()

        cy.wait(1500)

        cy.get('.maplibregl-canvas')
            .should('be.visible')
            .then(() => {
                cy.window().then(win => {
                    const newCenter = win.map.getCenter()
                    expect(newCenter.lng).to.not.equal(initialCenter.lng)
                    expect(newCenter.lat).to.not.equal(initialCenter.lat)

                    cy.get('.marker').should('exist')
                    cy.get('.marker').should('have.css', 'background-image').and('include', 'map-pin.svg')
                })
            })
    })

    it('features of the focused suggestion and the clicked suggestion should be the same', () => {
        cy.get('.search-locations').type('Berlin')
        cy.wait('@openRouteServiceSearchRequest')
        cy.get('.location-suggestion__item').first().trigger('mouseover')

        let focusedCoordinates = null
        let clickedCoordinates = null

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
            if (mapService.markerFeatures.length > 0) {
                const feature = mapService.markerFeatures[0]
                focusedCoordinates = feature.geometry.coordinates
            }
        })

        cy.get('.location-suggestion__item').first().click()

        cy.wait(500)

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
            if (mapService.markerFeatures.length > 0) {
                const feature = mapService.markerFeatures[0]
                clickedCoordinates = feature.geometry.coordinates
            }

            expect(focusedCoordinates).to.deep.equal(clickedCoordinates)
        })
    })
})
