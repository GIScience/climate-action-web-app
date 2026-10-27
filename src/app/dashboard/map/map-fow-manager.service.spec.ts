import { TestBed } from '@angular/core/testing'
import type { Feature as GeoJSONFeature } from 'geojson'
import type { GeoJSONSource, Map as MaplibreMap, Source } from 'maplibre-gl'
import { Mocked } from 'vitest'
import { MapFoWManagerService } from './map-fow-manager.service'

describe('MapFoWManagerService', () => {
    // `on` is simplified: maplibre's overloads don't type-check under vitest's Mocked<>
    type MockMap = Pick<
        MaplibreMap,
        | 'isStyleLoaded'
        | 'getSource'
        | 'addSource'
        | 'getLayer'
        | 'addLayer'
        | 'removeLayer'
        | 'removeSource'
        | 'moveLayer'
    > & { on: (type: string, ...args: unknown[]) => MaplibreMap }
    type MapLayer = NonNullable<ReturnType<MaplibreMap['getLayer']>>

    let service: MapFoWManagerService
    let mockMap: Mocked<MockMap>

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

    const createMockMap = (): Mocked<MockMap> => ({
        on: vi.fn(),
        isStyleLoaded: vi.fn().mockReturnValue(true),
        getSource: vi.fn().mockReturnValue(undefined),
        addSource: vi.fn(),
        getLayer: vi.fn().mockReturnValue(undefined),
        addLayer: vi.fn(),
        removeLayer: vi.fn(),
        removeSource: vi.fn(),
        moveLayer: vi.fn()
    })

    const asMap = (map: Mocked<MockMap>): MaplibreMap => map as unknown as MaplibreMap
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
            vi.clearAllMocks()
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

            const mockSource = { setData: vi.fn() }
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

            const mockSource = { setData: vi.fn() }
            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            expect(mockMap.removeLayer).not.toHaveBeenCalled()
        })
    })

    describe('clearByType', () => {
        beforeEach(() => {
            service.setMap(asMap(mockMap))
            vi.clearAllMocks()
        })

        it('should clear only geometries of specified type', () => {
            const focusedFeature = createMockFeature(simplePolygonCoords)
            const pinnedFeature = createMockFeature(anotherPolygonCoords)

            service.addGeometry(asMap(mockMap), 'focused-id', focusedFeature, 'focused')

            const mockSource = { setData: vi.fn() }
            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            service.addGeometry(asMap(mockMap), 'pinned-id', pinnedFeature, 'pinned')

            vi.clearAllMocks()
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
            vi.clearAllMocks()

            service.clearByType(asMap(mockMap), 'focused')

            expect(mockMap.addSource).not.toHaveBeenCalled()
            expect(mockMap.removeLayer).not.toHaveBeenCalled()
        })

        it('should preserve geometries of other types', () => {
            const focusedFeature = createMockFeature(simplePolygonCoords)
            const pinnedFeature = createMockFeature(anotherPolygonCoords)

            service.addGeometry(asMap(mockMap), 'focused-id', focusedFeature, 'focused')

            const mockSource = { setData: vi.fn() }
            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            service.addGeometry(asMap(mockMap), 'pinned-id', pinnedFeature, 'pinned')
            vi.clearAllMocks()

            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            service.clearByType(asMap(mockMap), 'focused')

            expect(mockSource.setData).toHaveBeenCalled()
            expect(mockMap.removeSource).not.toHaveBeenCalled()
        })

        it('should support the constraint geometry type', () => {
            const feature = createMockFeature(simplePolygonCoords)

            service.addGeometry(asMap(mockMap), 'constraint-0', feature, 'constraint')

            expect(mockMap.addSource).toHaveBeenCalledWith('fow-source', expect.any(Object))

            mockMap.getLayer.mockReturnValue(createMockLayer())
            mockMap.getSource.mockReturnValue(createMockSource())

            service.clearByType(asMap(mockMap), 'constraint')

            expect(mockMap.removeLayer).toHaveBeenCalledWith('fow-layer')
            expect(mockMap.removeSource).toHaveBeenCalledWith('fow-source')
        })

        it('should replace all geometries of a type in a single update via setGeometriesByType', () => {
            const feature1 = createMockFeature(simplePolygonCoords)
            const feature2 = createMockFeature(anotherPolygonCoords)
            const mockSource = { setData: vi.fn() }

            service.setGeometriesByType(asMap(mockMap), 'constraint', [feature1, feature2])
            expect(mockMap.addSource).toHaveBeenCalledTimes(2) // fow + outline sources, exactly one update

            mockMap.getSource.mockReturnValue(mockSource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())

            service.setGeometriesByType(asMap(mockMap), 'constraint', [feature1])
            expect(mockSource.setData).toHaveBeenCalledTimes(2) // fow + outline data, exactly one update

            service.setGeometriesByType(asMap(mockMap), 'constraint', [])
            expect(mockMap.removeLayer).toHaveBeenCalledWith('fow-layer')
            expect(mockMap.removeSource).toHaveBeenCalledWith('fow-source')
        })

        it('should not touch the map when setGeometriesByType replaces nothing with nothing', () => {
            service.setGeometriesByType(asMap(mockMap), 'constraint', [])

            expect(mockMap.addSource).not.toHaveBeenCalled()
            expect(mockMap.removeLayer).not.toHaveBeenCalled()
        })

        it('should isolate geometries across different maps', () => {
            const secondaryMockMap = createMockMap()
            const primaryFeature = createMockFeature(simplePolygonCoords)
            const reportFeature = createMockFeature(anotherPolygonCoords)
            const primarySource = { setData: vi.fn() }
            const reportSource = { setData: vi.fn() }

            service.setMap(asMap(secondaryMockMap))
            mockMap.getSource.mockReturnValue(primarySource as unknown as GeoJSONSource)
            mockMap.getLayer.mockReturnValue(createMockLayer())
            secondaryMockMap.getSource.mockReturnValue(reportSource as unknown as GeoJSONSource)
            secondaryMockMap.getLayer.mockReturnValue(createMockLayer())

            service.addGeometry(asMap(mockMap), 'primary-focused', primaryFeature, 'focused')
            service.addGeometry(asMap(secondaryMockMap), 'report-focused', reportFeature, 'focused')

            vi.clearAllMocks()
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
