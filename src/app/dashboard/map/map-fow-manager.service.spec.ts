import { TestBed } from '@angular/core/testing'
import type { Feature as GeoJSONFeature } from 'geojson'
import type { GeoJSONSource, Map as MaplibreMap, Source } from 'maplibre-gl'
import { MapFoWManagerService } from './map-fow-manager.service'

describe('MapFoWManagerService', () => {
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
        | 'moveLayer'
    >
    type MapLayer = NonNullable<ReturnType<MaplibreMap['getLayer']>>

    let service: MapFoWManagerService
    let mockMap: jest.Mocked<MockMap>

    const createMockFeature = (coordinates: number[][][]): GeoJSONFeature => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates },
        properties: {}
    })

    const simplePolygonCoords = [
        [
            [0, 0],
            [100000, 0],
            [100000, 100000],
            [0, 100000],
            [0, 0]
        ]
    ]

    const anotherPolygonCoords = [
        [
            [200000, 200000],
            [300000, 200000],
            [300000, 300000],
            [200000, 300000],
            [200000, 200000]
        ]
    ]

    const createMockMap = (): jest.Mocked<MockMap> => ({
        on: jest.fn(),
        isStyleLoaded: jest.fn().mockReturnValue(true),
        getSource: jest.fn().mockReturnValue(undefined),
        addSource: jest.fn(),
        getLayer: jest.fn().mockReturnValue(undefined),
        addLayer: jest.fn(),
        removeLayer: jest.fn(),
        removeSource: jest.fn(),
        moveLayer: jest.fn()
    })

    const asMap = (map: jest.Mocked<MockMap>): MaplibreMap => map as unknown as MaplibreMap
    const createMockLayer = (): MapLayer => ({ id: 'mock-layer' }) as unknown as MapLayer
    const createMockSource = (): Source => ({ type: 'geojson' }) as unknown as Source

    beforeEach(() => {
        mockMap = createMockMap()

        TestBed.configureTestingModule({
            providers: [MapFoWManagerService]
        })

        service = TestBed.inject(MapFoWManagerService)
    })

    describe('setMap', () => {
        it('should register style.load handler', () => {
            service.setMap(asMap(mockMap))

            expect(mockMap.on).toHaveBeenCalledWith('style.load', expect.any(Function))
        })

        it('should call updateMapLayers if style already loaded', () => {
            mockMap.isStyleLoaded.mockReturnValue(true)

            service.setMap(asMap(mockMap))

            expect(mockMap.isStyleLoaded).toHaveBeenCalled()
        })

        it('should not add layers when no geometries exist', () => {
            service.setMap(asMap(mockMap))

            expect(mockMap.addSource).not.toHaveBeenCalled()
            expect(mockMap.addLayer).not.toHaveBeenCalled()
        })
    })

    describe('addGeometry', () => {
        beforeEach(() => {
            service.setMap(asMap(mockMap))
            jest.clearAllMocks()
        })

        it('should add geometry and update map layers', () => {
            const feature = createMockFeature(simplePolygonCoords)

            service.addGeometry(asMap(mockMap), 'test-id', feature, 'focused')

            expect(mockMap.addSource).toHaveBeenCalledWith('fow-source', expect.any(Object))
            expect(mockMap.addLayer).toHaveBeenCalled()
            expect(mockMap.moveLayer).toHaveBeenCalledWith('fow-layer')
        })

        it('should update existing source when adding second geometry', () => {
            const feature1 = createMockFeature(simplePolygonCoords)
            const feature2 = createMockFeature(anotherPolygonCoords)

            service.addGeometry(asMap(mockMap), 'id-1', feature1, 'focused')

            const mockSource = { setData: jest.fn() }
            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            service.addGeometry(asMap(mockMap), 'id-2', feature2, 'pinned')

            expect(mockSource.setData).toHaveBeenCalled()
        })

        it('should store geometries with correct type', () => {
            const feature1 = createMockFeature(simplePolygonCoords)
            const feature2 = createMockFeature(anotherPolygonCoords)

            service.addGeometry(asMap(mockMap), 'focused-id', feature1, 'focused')
            service.addGeometry(asMap(mockMap), 'pinned-id', feature2, 'pinned')

            service.clearByType(asMap(mockMap), 'focused')

            const mockSource = { setData: jest.fn() }
            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            expect(mockMap.removeLayer).not.toHaveBeenCalled()
        })
    })

    describe('clearByType', () => {
        beforeEach(() => {
            service.setMap(asMap(mockMap))
            jest.clearAllMocks()
        })

        it('should clear only geometries of specified type', () => {
            const focusedFeature = createMockFeature(simplePolygonCoords)
            const pinnedFeature = createMockFeature(anotherPolygonCoords)

            service.addGeometry(asMap(mockMap), 'focused-id', focusedFeature, 'focused')

            const mockSource = { setData: jest.fn() }
            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            service.addGeometry(asMap(mockMap), 'pinned-id', pinnedFeature, 'pinned')

            jest.clearAllMocks()
            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            service.clearByType(asMap(mockMap), 'focused')

            expect(mockSource.setData).toHaveBeenCalled()
            expect(mockMap.removeLayer).not.toHaveBeenCalled()
        })

        it('should remove map layers when all geometries cleared', () => {
            const feature = createMockFeature(simplePolygonCoords)

            service.addGeometry(asMap(mockMap), 'test-id', feature, 'focused')

            mockMap.getLayer.mockReturnValue(createMockLayer())
            mockMap.getSource.mockReturnValue(createMockSource())

            service.clearByType(asMap(mockMap), 'focused')

            expect(mockMap.removeLayer).toHaveBeenCalledWith('fow-layer')
            expect(mockMap.removeSource).toHaveBeenCalledWith('fow-source')
        })

        it('should not update map if no geometries of that type exist', () => {
            const feature = createMockFeature(simplePolygonCoords)

            service.addGeometry(asMap(mockMap), 'pinned-id', feature, 'pinned')
            jest.clearAllMocks()

            service.clearByType(asMap(mockMap), 'focused')

            expect(mockMap.addSource).not.toHaveBeenCalled()
            expect(mockMap.removeLayer).not.toHaveBeenCalled()
        })

        it('should preserve geometries of other types', () => {
            const focusedFeature = createMockFeature(simplePolygonCoords)
            const pinnedFeature = createMockFeature(anotherPolygonCoords)

            service.addGeometry(asMap(mockMap), 'focused-id', focusedFeature, 'focused')

            const mockSource = { setData: jest.fn() }
            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            service.addGeometry(asMap(mockMap), 'pinned-id', pinnedFeature, 'pinned')
            jest.clearAllMocks()

            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            service.clearByType(asMap(mockMap), 'focused')

            expect(mockSource.setData).toHaveBeenCalled()
            expect(mockMap.removeSource).not.toHaveBeenCalled()
        })

        it('should isolate geometries across different maps', () => {
            const secondaryMockMap = createMockMap()
            const primaryFeature = createMockFeature(simplePolygonCoords)
            const reportFeature = createMockFeature(anotherPolygonCoords)
            const primarySource = { setData: jest.fn() }
            const reportSource = { setData: jest.fn() }

            service.setMap(asMap(secondaryMockMap))
            mockMap.getSource.mockReturnValue(primarySource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())
            secondaryMockMap.getSource.mockReturnValue(reportSource as unknown as GeoJSONSource)
            secondaryMockMap.getLayer.mockReturnValue(createMockLayer())

            service.addGeometry(asMap(mockMap), 'primary-focused', primaryFeature, 'focused')
            service.addGeometry(asMap(secondaryMockMap), 'report-focused', reportFeature, 'focused')

            jest.clearAllMocks()
            mockMap.getSource.mockReturnValue(primarySource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())
            secondaryMockMap.getSource.mockReturnValue(reportSource as unknown as GeoJSONSource)
            secondaryMockMap.getLayer.mockReturnValue(createMockLayer())

            service.clearByType(asMap(mockMap), 'focused')

            expect(primarySource.setData).not.toHaveBeenCalled()
            expect(mockMap.removeLayer).toHaveBeenCalledWith('fow-layer')
            expect(mockMap.removeSource).toHaveBeenCalledWith('fow-source')
            expect(reportSource.setData).not.toHaveBeenCalled()
            expect(secondaryMockMap.removeLayer).not.toHaveBeenCalled()
            expect(secondaryMockMap.removeSource).not.toHaveBeenCalled()
        })
    })
})
