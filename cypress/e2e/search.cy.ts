describe('Search', () => {

    beforeEach(() => {
        cy.visit('dashboard/plugin/plugin_blueprint');
        cy.get('.search-locations').type('Berlin');
        cy.wait(500);
    });

    it('should list suggestions when given a location', () => {
        cy.get('.location-suggestion__item').should('have.length.gte', 1)
            .each((item) => {
                cy.wrap(item).within(() => {
                    cy.get('.suggestion__title, .suggestion__subtitle').should('contain.text', 'Berlin');
                });
            });
    });

    it('should add a marker when hovering over a suggestion', () => {
        cy.get('.location-suggestion__item').first().trigger('mouseover');

        cy.get('.ol-viewport').should('be.visible').then(() => {
            cy.window().then(win => {
                expect(win.olMap).to.exist;

                const layers = win.olMap.getLayers().getArray();
                const markerLayer = layers.find(layer => {
                    const style = layer.style_;
                    if (style && style.image_ && style.image_.iconImage_ && style.image_.iconImage_.src_) {
                        return style.image_.iconImage_.src_.includes('map-pin.svg');
                    }
                    return false;
                });

                expect(markerLayer).to.exist;
            });
        });
    });

    it('should add a marker when clicking on a suggestion and change the map center', () => {
        let initialCenter;
        cy.window().then(win => {
            expect(win.olMap).to.exist;
            initialCenter = win.olMap.getView().getCenter();
        });

        cy.get('.location-suggestion__item').first().click();

        cy.wait(500);

        cy.get('.ol-viewport').should('be.visible').then(() => {
            cy.window().then(win => {
                const newCenter = win.olMap.getView().getCenter();
                expect(newCenter).to.not.deep.equal(initialCenter);

                const layers = win.olMap.getLayers().getArray();
                const markerLayer = layers.find(layer => {
                    const style = layer.style_;
                    if (style && style.image_ && style.image_.iconImage_ && style.image_.iconImage_.src_) {
                        return style.image_.iconImage_.src_.includes('map-pin.svg');
                    }
                    return false;
                });

                expect(markerLayer).to.exist;
            });
        });
    });
});