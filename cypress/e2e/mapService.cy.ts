import {
    mockGeoJson,
    mockGeoJsonComputation,
    mockGeoTiff,
    mockGeoTiffComputation,
    mockPluginBlueprint,
    mockPluginsList,
    mockSimpleGeoJson,
    mockSimpleGeoJsonComputation
} from '../support/interceptors'
import { beforeCompareSnapshots } from '../support/pre-test-cleanup'

describe('mapService', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    it('display the layerswitcher', () => {
        cy.get('.ol-layerswitcher').should('exist')

        const expectedTexts = ['OSM Carto', 'ESRI World Imagery', 'Carto Positron']

        cy.get('.ol-layerswitcher li.baselayer label span')
            .should('have.length', 3)
            .each(item => {
                cy.wrap(item)
                    .invoke('text')
                    .then(text => {
                        expect(expectedTexts).to.include(text)
                    })
            })
    })

    it('remembers the selected layer', () => {
        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.get('.ol-layerswitcher li.baselayer label span').eq(1).click()

        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.reload(true)

        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.get('.ol-layerswitcher li.baselayer label span')
            .eq(1)
            .invoke('text')
            .then(text => {
                cy.location('origin').then(origin => {
                    cy.getAllLocalStorage().then(result => {
                        expect(result[origin].selected_map_layer).to.equal(text)
                    })
                })
            })
    })

    it('remembers the selected layer even when a geotiff is loaded', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockGeoTiffComputation()
        mockGeoTiff()

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                        pluginId: 'plugin_blueprint',
                        pluginName: 'Plugin Blueprint',
                        status: 'SUCCESS',
                        timestamp: '2024-08-07T12:43:08.373768',
                        aoiName: '金融街街道'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.wait('@getGeoTiffComputation')

        cy.get('.ol-layerswitcher li.baselayer label span').eq(1).click()
        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.get('.parent-computation').eq(0).click()
        cy.get('.child-computation').eq(0).click()

        cy.wait('@getGeoTiff')

        cy.reload(true)

        cy.wait('@getGeoTiffComputation')

        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.get('.ol-layerswitcher li.baselayer label span')
            .eq(1)
            .invoke('text')
            .then(text => {
                cy.location('origin').then(origin => {
                    cy.getAllLocalStorage().then(result => {
                        expect(result[origin].selected_map_layer).to.equal(text)
                    })
                })
            })
    })

    it('remembers the collapsed state', () => {
        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.get('.ol-layerswitcher button').click()

        cy.get('.ol-layerswitcher').should('not.have.class', 'ol-forceopen')

        cy.reload(true)

        cy.waitForRenderComplete()

        cy.get('.ol-layerswitcher').should('not.have.class', 'ol-forceopen')

        cy.location('origin').then(origin => {
            cy.getAllLocalStorage().then(result => {
                expect(result[origin]).to.deep.equal({
                    layer_switcher_collapsed: 'true'
                })
            })
        })
    })

    it('should render a geojson layer correctly ', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockGeoJsonComputation()
        mockGeoJson()

        beforeCompareSnapshots(
            'app-plugin-catalog, .dashboard__left-column, .dashboard__middle-column, .dashboard__right-column, .ol-layerswitcher, .child-computations, .child-computations-wrapper'
        )

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
                        pluginId: 'plugin_blueprint',
                        pluginName: 'Plugin Blueprint',
                        timestamp: '2024-08-07T12:43:08.373768',
                        status: 'SUCCESS'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.wait('@getGeoJsonComputation')

        cy.get('.parent-computation').eq(0).click()
        cy.get('.child-computation').eq(0).click()

        cy.wait('@getGeoJson')
        cy.waitForRenderComplete()

        cy.compareSnapshot('geojson', 0.01)
    })

    it('should display tooltips from a geojson layer ', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockSimpleGeoJsonComputation()
        mockSimpleGeoJson()

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '1cfd2634-1724-43a2-ab1e-6466ba433364',
                        pluginId: 'plugin_blueprint',
                        pluginName: 'Plugin Blueprint',
                        timestamp: '2024-08-07T12:43:08.373768',
                        status: 'SUCCESS'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.wait('@getSimpleGeoJsonComputation')

        cy.get('.parent-computation').eq(0).click()
        cy.get('.child-computation').eq(0).click()

        cy.wait('@getSimpleGeoJson')

        cy.waitForRenderComplete()

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-root')).mapService

            const coordinate = [12952933.57136454, 4853791.28861462]
            const pixel = mapService.map.getPixelFromCoordinate(coordinate)

            const fakePointerEvent = new PointerEvent('click', {
                clientX: pixel[0],
                clientY: pixel[1]
            })

            const event = {
                type: 'click',
                target: mapService.map,
                map: mapService.map,
                pixel: pixel,
                coordinate: coordinate,
                dragging: false,
                originalEvent: fakePointerEvent
            }

            mapService.map.dispatchEvent(event)
        })

        cy.get('#map-popup-content-main-map span').should('contain.text', 'Connectivity : 0.0167')
    })

    it('should read the boundaries from the ohsome api and display them on the map', () => {
        mockPluginsList()
        mockPluginBlueprint()

        let currentRegionName = ''
        let newRegionName = ''

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()

        cy.waitForRenderComplete()

        cy.get('canvas.ol-layer').click()

        cy.waitForRenderComplete()

        cy.get('.selected-regions').children().should('have.class', 'region-item')

        cy.get('.selected-regions')
            .children()
            .first()
            .find('span.region-name')
            .invoke('text')
            .then(text => {
                currentRegionName = text
            })

        cy.get('canvas').eq(1).click(1000, 300)

        cy.waitForRenderComplete()

        cy.get('.selected-regions')
            .children()
            .first()
            .find('span.region-name')
            .invoke('text')
            .then(text => {
                newRegionName = text
                expect(newRegionName).to.not.equal(currentRegionName)
            })
    })

    it('selected regions should be deselectable', () => {
        mockPluginsList()
        mockPluginBlueprint()

        let currentSelectedFeaturesCount = 0
        let newSelectedFeaturesCount = 0

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()

        cy.waitForRenderComplete()

        cy.get('canvas.ol-layer').click()

        cy.waitForRenderComplete()

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
            currentSelectedFeaturesCount = mapService.selectedFeatures.getLength()

            expect(currentSelectedFeaturesCount).to.be.greaterThan(0)
        })

        cy.get('.selected-regions .deselect-region').first().click()

        cy.waitForRenderComplete()

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
            newSelectedFeaturesCount = mapService.selectedFeatures.getLength()

            expect(newSelectedFeaturesCount).to.not.equal(currentSelectedFeaturesCount)
        })
    })

    it('the boundaries from the ohsome api should be valid polygons or multipolygons', () => {
        mockPluginsList()
        mockPluginBlueprint()

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()
        cy.get('.ol-zoom-in').click()

        cy.waitForRenderComplete()

        cy.get('canvas.ol-layer').click()

        cy.waitForRenderComplete()

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
            const selectedFeature = mapService.getSelectedRegion()

            expect(selectedFeature).to.exist
            expect(selectedFeature.geometry.type).to.be.oneOf(['MultiPolygon', 'Polygon'])
            expect(selectedFeature.geometry.coordinates).to.be.an('array')
        })
    })
})
