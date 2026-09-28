import { TestBed } from '@angular/core/testing'
import type { GeoJSONSource, Map as MaplibreMap } from 'maplibre-gl'
import { SearchCentroidCollection } from '../computations-index/computation.interface'
import { MapSearchManagerService } from './map-search-manager.service'

describe('MapSearchManagerService', () => {
    type MockMap = Pick<
        MaplibreMap,
        | 'on'
        | 'isStyleLoaded'
        | 'getSource'
        | 'addSource'
        | 'getLayer'
        | 'addLayer'
        | 'removeLayer'
        | 'removeSource'
        | 'setFilter'
        | 'setLayoutProperty'
        | 'queryRenderedFeatures'
    >
    type MapLayer = NonNullable<ReturnType<MaplibreMap['getLayer']>>

    let service: MapSearchManagerService
    let mockMap: jest.Mocked<MockMap>

    const centroids: SearchCentroidCollection = { type: 'FeatureCollection', features: [] }
    const mockLayer = { id: 'mock-layer' } as unknown as MapLayer

    beforeEach(() => {
        mockMap = {
            on: jest.fn(),
            isStyleLoaded: jest.fn().mockReturnValue(true),
            getSource: jest.fn().mockReturnValue(undefined),
            addSource: jest.fn(),
            getLayer: jest.fn().mockReturnValue(undefined),
            addLayer: jest.fn(),
            removeLayer: jest.fn(),
            removeSource: jest.fn(),
            setFilter: jest.fn(),
            setLayoutProperty: jest.fn(),
            queryRenderedFeatures: jest.fn().mockReturnValue([])
        }

        TestBed.configureTestingModule({
            providers: [MapSearchManagerService]
        })

        service = TestBed.inject(MapSearchManagerService)
        service.setMap(mockMap as unknown as MaplibreMap)
    })

    it('showSearchLayers should add the clustered centroid source, boundary source and layers', () => {
        service.showSearchLayers('test_plugin', centroids)

        expect(mockMap.addSource).toHaveBeenCalledWith(
            'search-centroids-source',
            expect.objectContaining({ type: 'geojson', data: centroids, cluster: true })
        )
        // expect(mockMap.addSource).toHaveBeenCalledWith(
        //     'search-boundaries-source',
        //     expect.objectContaining({ type: 'vector' })
        // )
        expect(mockMap.addLayer).toHaveBeenCalled()
    })

    it('showSearchLayers should update the existing source and filters instead of re-adding layers', () => {
        const mockSource = { setData: jest.fn() }
        mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
        mockMap.getLayer.mockReturnValue(mockLayer)

        service.showSearchLayers('other_plugin', centroids)

        expect(mockSource.setData).toHaveBeenCalledWith(centroids)
        expect(mockMap.addLayer).not.toHaveBeenCalled()
        // expect(JSON.stringify(mockMap.setFilter.mock.calls[0][1])).toContain('other_plugin')
        expect(mockMap.setLayoutProperty).toHaveBeenCalledWith('search-clusters', 'visibility', 'visible')
    })

    it('showSearchLayers should defer the layer sync until the style has loaded', () => {
        mockMap.isStyleLoaded.mockReturnValue(false)
        service.setMap(mockMap as unknown as MaplibreMap)

        service.showSearchLayers('test_plugin', centroids)

        expect(mockMap.addSource).not.toHaveBeenCalled()

        const styleLoadCall = mockMap.on.mock.calls.find(call => call[0] === 'style.load')
        ;(styleLoadCall![1] as () => void)()

        expect(mockMap.addSource).toHaveBeenCalled()
    })

    it('hideSearchLayers should hide the layers and clearSearchLayers should remove them', () => {
        service.showSearchLayers('test_plugin', centroids)
        mockMap.getLayer.mockReturnValue(mockLayer)
        mockMap.getSource.mockReturnValue({} as GeoJSONSource)

        service.hideSearchLayers()

        expect(mockMap.setLayoutProperty).toHaveBeenCalledWith('search-clusters', 'visibility', 'none')
        expect(mockMap.removeLayer).not.toHaveBeenCalled()

        service.clearSearchLayers()

        expect(mockMap.removeLayer).toHaveBeenCalled()
        expect(mockMap.removeSource).toHaveBeenCalledWith('search-centroids-source')
        expect(mockMap.removeSource).toHaveBeenCalledWith('search-boundaries-source')
    })

    it('isInteractiveFeatureAt should return false while the search mode is hidden', () => {
        expect(service.isInteractiveFeatureAt([0, 0])).toBe(false)
        expect(mockMap.queryRenderedFeatures).not.toHaveBeenCalled()
    })
})
