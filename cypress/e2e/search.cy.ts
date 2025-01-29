describe('Search', () => {
    beforeEach(() => {
        cy.visit('dashboard/plugin/plugin_blueprint')
    })

    it('should list suggestions when given a location', () => {
        cy.get('.search-locations').type('Berlin')
        cy.wait(500)
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
        cy.wait(500)
        cy.get('.location-suggestion__item').first().trigger('mouseover')

        cy.get('.ol-viewport')
            .should('be.visible')
            .then(() => {
                cy.window().then(win => {
                    expect(win.olMap).to.exist

                    const layers = win.olMap.getLayers().getArray()
                    const markerLayer = layers.find(layer => {
                        const style = layer.style_
                        if (style && style.image_ && style.image_.iconImage_ && style.image_.iconImage_.src_) {
                            return style.image_.iconImage_.src_.includes('map-pin.svg')
                        }
                        return false
                    })

                    expect(markerLayer).to.exist
                })
            })
    })

    it('should add a marker when clicking on a suggestion and change the map center', () => {
        cy.get('.search-locations').type('Berlin')
        cy.wait(500)
        let initialCenter
        cy.window().then(win => {
            expect(win.olMap).to.exist
            initialCenter = win.olMap.getView().getCenter()
        })

        cy.get('.location-suggestion__item').first().click()

        cy.wait(500)

        cy.get('.ol-viewport')
            .should('be.visible')
            .then(() => {
                cy.window().then(win => {
                    const newCenter = win.olMap.getView().getCenter()
                    expect(newCenter).to.not.deep.equal(initialCenter)

                    const layers = win.olMap.getLayers().getArray()
                    const markerLayer = layers.find(layer => {
                        const style = layer.style_
                        if (style && style.image_ && style.image_.iconImage_ && style.image_.iconImage_.src_) {
                            return style.image_.iconImage_.src_.includes('map-pin.svg')
                        }
                        return false
                    })

                    expect(markerLayer).to.exist
                })
            })
    })

    it('features of the focused suggestion and the clicked suggestion should be the same', () => {
        cy.get('.search-locations').type('Währing')
        cy.wait(500)
        cy.get('.location-suggestion__item').first().trigger('mouseover')

        let focusedCoordinates = null
        let clickedCoordinates = null

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-root')).mapService
            focusedCoordinates = mapService.markerFeatures.item(0).getGeometry().getCoordinates()
        })

        cy.get('.location-suggestion__item').first().click()

        cy.wait(500)

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-root')).mapService
            clickedCoordinates = mapService.markerFeatures.item(0).getGeometry().getCoordinates()

            expect(focusedCoordinates).to.deep.equal(clickedCoordinates)
        })
    })
})
