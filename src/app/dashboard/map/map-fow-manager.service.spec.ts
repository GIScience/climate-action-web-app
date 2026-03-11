import { TestBed } from '@angular/core/testing'
import type { Feature as GeoJSONFeature } from 'geojson'
import { MapFoWManagerService } from './map-fow-manager.service'

describe('MapFoWManagerService', () => {
    let service: MapFoWManagerService
    let mockMap: {
        on: jest.Mock
        isStyleLoaded: jest.Mock
        getSource: jest.Mock
        addSource: jest.Mock
        getLayer: jest.Mock
        addLayer: jest.Mock
        removeLayer: jest.Mock
        removeSource: jest.Mock
        moveLayer: jest.Mock
    }

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
            moveLayer: jest.fn()
        }

        TestBed.configureTestingModule({
            providers: [MapFoWManagerService]
        })

        service = TestBed.inject(MapFoWManagerService)
    })

    describe('setMap', () => {
        it('should register style.load handler', () => {
            service.setMap(mockMap as never)

            expect(mockMap.on).toHaveBeenCalledWith('style.load', expect.any(Function))
        })

        it('should call updateMapLayers if style already loaded', () => {
            mockMap.isStyleLoaded.mockReturnValue(true)

            service.setMap(mockMap as never)

            expect(mockMap.isStyleLoaded).toHaveBeenCalled()
        })

        it('should not add layers when no geometries exist', () => {
            service.setMap(mockMap as never)

            expect(mockMap.addSource).not.toHaveBeenCalled()
            expect(mockMap.addLayer).not.toHaveBeenCalled()
        })
    })

    describe('addGeometry', () => {
        beforeEach(() => {
            service.setMap(mockMap as never)
            jest.clearAllMocks()
        })

        it('should add geometry and update map layers', () => {
            const feature = createMockFeature(simplePolygonCoords)

            service.addGeometry('test-id', feature, 'focused')

            expect(mockMap.addSource).toHaveBeenCalledWith('fow-source', expect.any(Object))
            expect(mockMap.addLayer).toHaveBeenCalled()
            expect(mockMap.moveLayer).toHaveBeenCalledWith('fow-layer')
        })

        it('should update existing source when adding second geometry', () => {
            const feature1 = createMockFeature(simplePolygonCoords)
            const feature2 = createMockFeature(anotherPolygonCoords)

            service.addGeometry('id-1', feature1, 'focused')

            const mockSource = { setData: jest.fn() }
            mockMap.getSource.mockReturnValue(mockSource)
            mockMap.getLayer.mockReturnValue({})

            service.addGeometry('id-2', feature2, 'pinned')

            expect(mockSource.setData).toHaveBeenCalled()
        })

        it('should store geometries with correct type', () => {
            const feature1 = createMockFeature(simplePolygonCoords)
            const feature2 = createMockFeature(anotherPolygonCoords)

            service.addGeometry('focused-id', feature1, 'focused')
            service.addGeometry('pinned-id', feature2, 'pinned')

            service.clearByType('focused')

            const mockSource = { setData: jest.fn() }
            mockMap.getSource.mockReturnValue(mockSource)
            mockMap.getLayer.mockReturnValue({})

            expect(mockMap.removeLayer).not.toHaveBeenCalled()
        })
    })

    describe('clearByType', () => {
        beforeEach(() => {
            service.setMap(mockMap as never)
            jest.clearAllMocks()
        })

        it('should clear only geometries of specified type', () => {
            const focusedFeature = createMockFeature(simplePolygonCoords)
            const pinnedFeature = createMockFeature(anotherPolygonCoords)

            service.addGeometry('focused-id', focusedFeature, 'focused')

            const mockSource = { setData: jest.fn() }
            mockMap.getSource.mockReturnValue(mockSource)
            mockMap.getLayer.mockReturnValue({})

            service.addGeometry('pinned-id', pinnedFeature, 'pinned')

            jest.clearAllMocks()
            mockMap.getSource.mockReturnValue(mockSource)
            mockMap.getLayer.mockReturnValue({})

            service.clearByType('focused')

            expect(mockSource.setData).toHaveBeenCalled()
            expect(mockMap.removeLayer).not.toHaveBeenCalled()
        })

        it('should remove map layers when all geometries cleared', () => {
            const feature = createMockFeature(simplePolygonCoords)

            service.addGeometry('test-id', feature, 'focused')

            mockMap.getLayer.mockReturnValue({})
            mockMap.getSource.mockReturnValue({})

            service.clearByType('focused')

            expect(mockMap.removeLayer).toHaveBeenCalledWith('fow-layer')
            expect(mockMap.removeSource).toHaveBeenCalledWith('fow-source')
        })

        it('should not update map if no geometries of that type exist', () => {
            const feature = createMockFeature(simplePolygonCoords)

            service.addGeometry('pinned-id', feature, 'pinned')
            jest.clearAllMocks()

            service.clearByType('focused')

            expect(mockMap.addSource).not.toHaveBeenCalled()
            expect(mockMap.removeLayer).not.toHaveBeenCalled()
        })

        it('should preserve geometries of other types', () => {
            const focusedFeature = createMockFeature(simplePolygonCoords)
            const pinnedFeature = createMockFeature(anotherPolygonCoords)

            service.addGeometry('focused-id', focusedFeature, 'focused')

            const mockSource = { setData: jest.fn() }
            mockMap.getSource.mockReturnValue(mockSource)
            mockMap.getLayer.mockReturnValue({})

            service.addGeometry('pinned-id', pinnedFeature, 'pinned')
            jest.clearAllMocks()

            mockMap.getSource.mockReturnValue(mockSource)
            mockMap.getLayer.mockReturnValue({})

            service.clearByType('focused')

            expect(mockSource.setData).toHaveBeenCalled()
            expect(mockMap.removeSource).not.toHaveBeenCalled()
        })
    })
})
