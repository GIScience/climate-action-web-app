import {
    mockBlueprintTable,
    mockGeoJsonComputationJinrongjie,
    mockGeoJsonJinrongjie,
    mockPluginBlueprint,
    mockPluginBlueprintComputation,
    mockPluginsList
} from '../support/interceptors'

describe('report builder', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    it('the report builder should work correctly', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockPluginBlueprintComputation()
        mockBlueprintTable()

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
                        pluginId: 'plugin_blueprint',
                        request_ts: '2024-12-17T08:55:23.807074Z',
                        status: 'SUCCESS',
                        state: 'ACTIVE',
                        flags: [],
                        aoiName: 'Heidelberg'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.computations-index-content').should('exist')

        cy.get('.parent-computation').eq(0).click()
        cy.wait('@getPluginBlueprintComputation')

        cy.get('.child-computation').eq(0).realHover()
        cy.get('.child-computation').eq(0).find('.add-to-report-btn').click()

        cy.get('.child-computation').eq(1).realHover()
        cy.get('.child-computation').eq(1).find('.add-to-report-btn').click()

        cy.get('.report-item').should('exist').should('have.length', 2)

        cy.get('.report-item').eq(0).find('.report-item-header').should('contain', 'A Text')

        cy.get('.report-item').eq(1).find('.remove-btn').click()

        cy.get('.report-item').should('exist').should('have.length', 1)

        cy.get('.report-controls').find('.remove-all-btn').click()

        cy.get('.report-item').should('not.exist')

        cy.get('.report-header').find('.close-btn').click()

        cy.get('.report-window').should('not.exist')
    })

    it('ensure active map artifact is cleared upon report instantiation', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockGeoJsonComputationJinrongjie()
        mockGeoJsonJinrongjie()

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
                        pluginId: 'plugin_blueprint',
                        request_ts: '2023-09-27T16:42:52+01:00',
                        status: 'SUCCESS',
                        state: 'ACTIVE',
                        flags: [],
                        aoiName: 'Jinrongjie'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.computations-index-content').should('exist')

        cy.get('.parent-computation').eq(0).click()
        cy.wait('@getGeoJsonComputationJinrongjie')

        cy.get('.child-computation').eq(0).click()

        cy.wait('@getGeoJsonJinrongjie')

        const layerPrefix = 'geojson-Connectivity-'
        cy.window().should(win => {
            const map = (win as any).ng.getComponent(win.document.querySelector('app-map')).mapService.map
            const layerIds = map.getStyle().layers.map((l: { id: string }) => l.id)
            expect(layerIds.some((id: string) => id.startsWith(layerPrefix))).to.be.true
        })

        cy.get('.maplibregl-layer-controls .map-layer .map-layer-header').should('contain', 'Connectivity')

        cy.get('.child-computation').eq(0).realHover()
        cy.get('.child-computation').eq(0).find('.add-to-report-btn').click()

        cy.window().should(win => {
            const map = (win as any).ng.getComponent(win.document.querySelector('app-map')).mapService.map
            const layerIds = map.getStyle().layers.map((l: { id: string }) => l.id)
            expect(layerIds.some((id: string) => id.startsWith(layerPrefix))).to.be.false
        })

        cy.get('.maplibregl-layer-controls').should('have.css', 'display', 'none')
    })

    it('ensure fow is cleared on computation collapse, after having added an artifact to the report', () => {
        mockPluginsList()
        mockPluginBlueprint()
        mockGeoJsonComputationJinrongjie()
        mockGeoJsonJinrongjie()

        cy.window().then(win => {
            win.localStorage.setItem(
                'plugin_runs',
                JSON.stringify([
                    {
                        correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
                        pluginId: 'plugin_blueprint',
                        request_ts: '2023-09-27T16:42:52+01:00',
                        status: 'SUCCESS',
                        flags: [],
                        aoiName: 'Jinrongjie'
                    }
                ])
            )
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginBlueprint')

        cy.get('.computations-index-content').should('exist')

        cy.get('.parent-computation').eq(0).click()
        cy.wait('@getGeoJsonComputationJinrongjie')

        cy.window().should(win => {
            const map = (win as any).ng.getComponent(win.document.querySelector('app-map')).mapService.map
            const layerIds = map.getStyle().layers.map((l: { id: string }) => l.id)
            expect(layerIds.some((id: string) => id.startsWith('fow-layer'))).to.be.true
        })

        cy.get('.child-computation').eq(0).click()

        cy.wait('@getGeoJsonJinrongjie')

        cy.get('.child-computation').eq(0).realHover()
        cy.get('.child-computation').eq(0).find('.add-to-report-btn').click()

        cy.get('.report-controls').find('.remove-all-btn').click()

        cy.get('.report-header').find('.close-btn').click()

        cy.get('.parent-computation').eq(0).click()

        cy.window().should(win => {
            const map = (win as any).ng.getComponent(win.document.querySelector('app-map')).mapService.map
            const layerIds = map.getStyle().layers.map((l: { id: string }) => l.id)
            expect(layerIds.some((id: string) => id.startsWith('fow-layer'))).to.be.false
        })
    })
})
