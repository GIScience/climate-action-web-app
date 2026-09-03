import {
    mockGeoJsonComputationJinrongjie,
    mockGeoJsonComputationWestChangan,
    mockGeoJsonDetourFactorsJinrongjie,
    mockGeoJsonJinrongjie,
    mockGeoJsonWestChangan,
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
        cy.get('.maplibregl-style-switcher-container').should('exist')

        const expectedTexts = ['Graybeard', 'Colorful', 'ESRI World Imagery']

        cy.get('.maplibregl-style-list button')
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
        mockPluginsList()
        mockPluginBlueprint()

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.get('.maplibregl-style-list button').eq(1).click()

        cy.get('.maplibregl-style-list button').eq(1).should('have.class', 'active')

        cy.reload(true)

        cy.get('.maplibregl-style-list button').eq(1).should('have.class', 'active')

        cy.get('.maplibregl-style-list button')
            .eq(1)
            .invoke('text')
            .then(text => {
                cy.location('origin').then(origin => {
                    cy.getAllLocalStorage().then(result => {
                        const mapPrefs = JSON.parse(result[origin].map_prefs)
                        expect(mapPrefs.selectedLayer).to.equal(text)
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
                        status: 'SUCCESS',
                        flags: [],
                        state: 'ACTIVE',
                        request_ts: '2024-08-07T12:43:08.373768',
                        aoiName: '金融街街道'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.maplibregl-style-list button').eq(1).click()
        cy.get('.maplibregl-style-list button').eq(1).should('have.class', 'active')

        cy.get('.parent-computation').eq(0).click()
        cy.wait('@getGeoTiffComputation')
        cy.get('.child-computation').eq(0).click()

        cy.wait('@getGeoTiff')

        cy.reload(true)

        cy.get('.maplibregl-style-list button').eq(1).should('have.class', 'active')

        cy.get('.maplibregl-style-list button')
            .eq(1)
            .invoke('text')
            .then(text => {
                cy.location('origin').then(origin => {
                    cy.getAllLocalStorage().then(result => {
                        const mapPrefs = JSON.parse(result[origin].map_prefs)
                        expect(mapPrefs.selectedLayer).to.equal(text)
                    })
                })
            })
    })

    it('remembers the collapsed state', () => {
        mockPluginsList()
        mockPluginBlueprint()

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.get('.maplibregl-style-switcher').click()

        cy.get('.maplibregl-style-switcher-container').should('not.have.class', 'expanded')

        cy.reload(true)

        cy.waitForRenderComplete()

        cy.get('.maplibregl-style-switcher-container').should('not.have.class', 'expanded')

        cy.location('origin').then(origin => {
            cy.getAllLocalStorage().then(result => {
                cy.getAllLocalStorage().then(result => {
                    const mapPrefs = JSON.parse(result[origin].map_prefs)
                    expect(mapPrefs.layerSwitcherCollapsed).to.equal(true)
                })
            })
        })
    })

    it('should render a geojson layer correctly ', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockGeoJsonComputationJinrongjie()
        mockGeoJsonJinrongjie()

        beforeCompareSnapshots(
            'app-plugin-catalog, .dashboard__left-column, .dashboard__middle-column, .dashboard__right-column, .maplibregl-control-container, .child-computations, .child-computations-wrapper, .toast-container'
        )

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
                        pluginId: 'plugin_blueprint',
                        request_ts: '2024-08-07T12:43:08.373768',
                        state: 'ACTIVE',
                        status: 'SUCCESS',
                        aoiName: '金融街街道'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.parent-computation').eq(0).click()
        cy.wait('@getGeoJsonComputationJinrongjie')
        cy.wait(1500)
        cy.get('.child-computation').eq(0).click()

        cy.wait('@getGeoJsonJinrongjie')
        cy.waitForRenderComplete()
        cy.wait(500)

        cy.compareSnapshot('geojson', 0.05)
    })

    it('should be able to pin two map artifacts correctly ', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockGeoJsonComputationJinrongjie()
        mockGeoJsonComputationWestChangan()
        mockGeoJsonJinrongjie()
        mockGeoJsonWestChangan()

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
                        pluginId: 'plugin_blueprint',
                        request_ts: '2024-08-07T12:43:08.373Z',
                        flags: [],
                        state: 'ACTIVE',
                        status: 'SUCCESS',
                        aoiName: '金融街街道'
                    },
                    {
                        correlation_uuid: '0f4552a1-79c4-452c-9e01-3c33a9bae0e8',
                        pluginId: 'plugin_blueprint',
                        request_ts: '2023-05-25T16:57:52Z',
                        flags: [],
                        state: 'ACTIVE',
                        status: 'SUCCESS',
                        aoiName: '西长安街街道'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.parent-computation').eq(0).click()
        cy.wait('@getGeoJsonComputationJinrongjie')
        cy.get('.child-computation').eq(0).realHover()
        cy.get('.child-computation').eq(0).get('.layer-pin-btn').eq(0).click()

        cy.wait('@getGeoJsonJinrongjie')
        cy.waitForRenderComplete()

        cy.get('.parent-computation').eq(1).click()
        cy.wait('@getGeoJsonComputationWestChangan')
        cy.get('.child-computation').eq(0).realHover()
        cy.get('.child-computation').eq(0).get('.layer-pin-btn').eq(0).click()

        cy.wait('@getGeoJsonWestChangan')
        cy.waitForRenderComplete()
        cy.wait(500)

        cy.get('.maplibregl-layer-controls .map-layer').should('have.length', 2)

        // TODO: add snapshot comparison
    })

    it('should display checkboxes for each category in case of vector artifacts with discrete legend ', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockGeoJsonComputationJinrongjie()
        mockGeoJsonDetourFactorsJinrongjie()

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
                        pluginId: 'plugin_blueprint',
                        request_ts: '2024-08-07T12:43:08.373Z',
                        flags: [],
                        state: 'ACTIVE',
                        status: 'SUCCESS',
                        aoiName: '金融街街道'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.parent-computation').eq(0).click()
        cy.wait('@getGeoJsonComputationJinrongjie')
        cy.get('.child-computation').eq(1).click()

        cy.wait('@getGeoJsonDetourFactorsJinrongjie')
        cy.waitForRenderComplete()

        cy.get('.discrete-legend ul li').should('have.length', 3)
        cy.get('.discrete-legend ul li').eq(0).get('input').should('be.checked')

        // TODO: add snapshot comparison, persistance of 'checked' during rebuild (pinning), ID collisions (same artifact filename), toggles still activating after returning from report instantiation
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
                        request_ts: '2024-08-07T12:43:08.373768',
                        status: 'SUCCESS',
                        state: 'ACTIVE',
                        aoiName: '金融街街道'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.parent-computation').eq(0).click()
        cy.wait('@getSimpleGeoJsonComputation')
        cy.get('.child-computation').eq(0).click()

        cy.wait('@getSimpleGeoJson')

        cy.waitForRenderComplete()

        cy.window().then(win => {
            const map = win.ng.getComponent(win.document.querySelector('app-map')).mapService.map
            const lng = (12952933.57136454 * 180) / 20037508.34
            const lat = (Math.atan(Math.exp((4853791.28861462 * Math.PI) / 20037508.34)) * 360) / Math.PI - 90
            const point = map.project([lng, lat])

            map.fire('mousemove', {
                type: 'mousemove',
                target: map,
                originalEvent: new MouseEvent('mousemove', { clientX: point.x, clientY: point.y, bubbles: true }),
                point: { x: point.x, y: point.y },
                lngLat: map.unproject([point.x, point.y])
            })
        })

        cy.get('.maplibregl-popup-content').should('be.visible')
        cy.get('.maplibregl-popup-content').should('contain.text', 'Connectivity: 0.0167')
    })

    it('should read boundaries from ohsome api, display them, validate geometry, and allow deselection', () => {
        mockPluginsList()
        mockPluginBlueprint()

        let currentRegionName = ''
        let newRegionName = ''
        let currentSelectedFeaturesCount = 0
        let newSelectedFeaturesCount = 0

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.clickFakeUserButtonUntilGone()

        cy.wait(1000)

        cy.get('.new-compute').click()

        cy.wait(500)

        cy.window()
            .then(win => {
                const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
                if (!mapService.regionLayer || !mapService.regionLayer.visible) {
                    return false
                }
                return true
            })
            .then(isReady => {
                if (!isReady) {
                    cy.get('.new-compute').click()
                    cy.wait(500)
                    cy.get('.new-compute').click()
                    cy.wait(500)
                }
            })

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
            if (mapService.regionLayer) {
                mapService.map.setLayoutProperty(mapService.regionLayer.layerId, 'visibility', 'visible')
                mapService.regionLayer.visible = true
            }
        })

        cy.wait(2000)

        cy.get('.maplibregl-ctrl-zoom-in').click()
        cy.get('.maplibregl-ctrl-zoom-in').click()
        cy.get('.maplibregl-ctrl-zoom-in').click()
        cy.get('.maplibregl-ctrl-zoom-in').click()
        cy.get('.maplibregl-ctrl-zoom-in').click()

        cy.waitForRenderComplete()

        // Should read boundaries and display them
        cy.get('canvas.maplibregl-canvas').click()

        cy.get('.selected-regions').children().should('have.class', 'region-summary')

        cy.get('.selected-regions')
            .children()
            .find('span.region-name')
            .invoke('text')
            .then(text => {
                currentRegionName = text
            })

        // Validate geometry is correct for selected region
        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
            const selectedFeature = mapService.getSelectedRegion()
            currentSelectedFeaturesCount = mapService.selectedFeatures.length

            expect(selectedFeature).to.exist
            expect(selectedFeature.geometry.type).to.be.equal('MultiPolygon')
            expect(selectedFeature.geometry.coordinates).to.be.an('array')
            expect(currentSelectedFeaturesCount).to.be.greaterThan(0)
        })

        // Test selecting a different region
        cy.get('canvas.maplibregl-canvas').click(1000, 300)

        cy.wait(1000)

        cy.get('.selected-regions')
            .children()
            .first()
            .find('span.region-name')
            .invoke('text')
            .then(text => {
                newRegionName = text
                expect(newRegionName).to.not.equal(currentRegionName)
            })

        // Should be able to deselect regions
        cy.get('.selected-regions .deselect-region').first().click()

        cy.waitForRenderComplete()

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
            newSelectedFeaturesCount = mapService.selectedFeatures.length

            expect(newSelectedFeaturesCount).to.not.equal(currentSelectedFeaturesCount)
        })
    })

    it('should be able to draw custom shapes on the map', () => {
        mockPluginsList()
        mockPluginBlueprint()

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.clickFakeUserButtonUntilGone()

        cy.wait(1000)

        cy.get('.new-compute').click()

        cy.wait(500)

        cy.get('.maplibregl-ctrl-zoom-in').click()
        cy.get('.maplibregl-ctrl-zoom-in').click()
        cy.get('.maplibregl-ctrl-zoom-in').click()

        cy.waitForRenderComplete()

        cy.get('.draw-button').eq(2).click()

        cy.wait(2500)

        cy.get('canvas.maplibregl-canvas').click(800, 425, { force: true })
        cy.get('canvas.maplibregl-canvas').click(850, 550, { force: true })

        cy.waitForRenderComplete()
        cy.wait(500)

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
            expect(mapService.selectedFeatures).to.have.length.greaterThan(0)

            if (mapService.selectedFeatures.length > 0) {
                const feature = mapService.selectedFeatures[0]
                expect(feature.geometry.type).to.be.equal('MultiPolygon')
            }
        })
    })

    it('should be able to render geometry from an uploaded file, and auto-buffers paths', () => {
        mockPluginsList()
        mockPluginBlueprint()

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.clickFakeUserButtonUntilGone()

        cy.wait(1000)

        cy.get('.new-compute').click()

        cy.wait(500)

        cy.get('.draw-button').eq(1).click()

        cy.get('input[id="aoiFile"][type="file"]').attachFile('sample_gpx_aoi.gpx')

        cy.waitForRenderComplete()
        cy.wait(1000)

        cy.window().then(win => {
            const mapService = win.ng.getComponent(win.document.querySelector('app-map')).mapService
            expect(mapService.selectedFeatures).to.have.length.greaterThan(0)

            if (mapService.selectedFeatures.length > 0) {
                const feature = mapService.selectedFeatures[0]
                expect(feature.geometry.type).to.be.equal('Polygon')
            }
        })

        cy.get('.selected-regions input[type="text"]').should('have.value', 'from Gémenos to Abbaye de Saint-Pons')
    })
})
