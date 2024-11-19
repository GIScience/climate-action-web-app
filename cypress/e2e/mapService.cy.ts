import {mockPluginsList, mockPluginBlueprint, mockGeoTiffComputation, mockGeoJsonComputation, mockGeoTiff, mockGeoJson} from '../support/interceptors'

describe('mapService', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    it('display the layerswitcher', () => {
        cy.get('.ol-layerswitcher').should('exist')

        const expectedTexts = ['OSM Carto', 'Bing Aerial Imagery', 'HeiGIT Carto'];

        cy.get('.ol-layerswitcher li.baselayer label span')
            .should('have.length', 3)
            .each((item) => {
                cy.wrap(item).invoke('text').then((text) => {
                    expect(expectedTexts).to.include(text);
                });
            });
    })

    it('remembers the selected layer', () => {
        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.get('.ol-layerswitcher li.baselayer label span').eq(1).click()

        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.reload(true)

        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.get('.ol-layerswitcher li.baselayer label span').eq(1).invoke('text').then((text) => {
            cy.location('origin').then((origin) => {
                cy.getAllLocalStorage().then((result) => {
                    expect(result[origin].selected_map_layer).to.equal(text);
                });
            });
        });
    })

    it('remembers the selected layer even when a geotiff is loaded', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockGeoTiffComputation()
        mockGeoTiff()

        cy.window().then((win) => {
            win.localStorage.setItem('plugin_runs', JSON.stringify([{
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                pluginId: 'plugin_blueprint',
                pluginName: 'Plugin Blueprint',
                timestamp: '2024-08-07T12:43:08.373768',
                status: 'completed'
            }]))
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.wait('@getGeoTiffComputation')

        cy.get('.ol-layerswitcher li.baselayer label span').eq(1).click()
        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.get('.artifact-parent-computation').eq(0).click()
        cy.get('.artifact-child-computation').eq(0).click()

        cy.wait('@getGeoTiff')

        cy.reload(true)

        cy.wait('@getGeoTiffComputation')

        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.get('.ol-layerswitcher li.baselayer label span').eq(1).invoke('text').then((text) => {
            cy.location('origin').then((origin) => {
                cy.getAllLocalStorage().then((result) => {
                    expect(result[origin].selected_map_layer).to.equal(text);
                });
            });
        });
    })

    it('remembers the collapsed state', () => {
        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.get('.ol-layerswitcher button').click()

        cy.get('.ol-layerswitcher').should('not.have.class', 'ol-forceopen')

        cy.wait(500)

        cy.reload(true)

        cy.wait(500)

        cy.get('.ol-layerswitcher').should('not.have.class', 'ol-forceopen')

        cy.location('origin').then((origin) => {
            cy.getAllLocalStorage().then((result) => {
                expect(result[origin]).to.deep.equal({
                    layer_switcher_collapsed: 'true',
                });
            });
        });
    })

    it('should render a geojson layer correctly ', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockGeoJsonComputation()
        mockGeoJson()

        cy.window().then((win) => {
            win.localStorage.setItem('plugin_runs', JSON.stringify([{
                correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
                pluginId: 'plugin_blueprint',
                pluginName: 'Plugin Blueprint',
                timestamp: '2024-08-07T12:43:08.373768',
                status: 'completed'
            }]))
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.wait('@getGeoJsonComputation')

        cy.get('.artifact-parent-computation').eq(0).click()
        cy.get('.artifact-child-computation').eq(0).click()

        cy.wait('@getGeoJson')
        cy.wait(2500)

        cy.compareSnapshot('geojson', 0.01)
    })
})