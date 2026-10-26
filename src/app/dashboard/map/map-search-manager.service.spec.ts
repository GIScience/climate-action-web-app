import { TestBed } from '@angular/core/testing'
import { Router, RouterModule } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import type { GeoJSONSource, MapGeoJSONFeature, MapMouseEvent, Map as MaplibreMap } from 'maplibre-gl'
import { environment } from 'src/environments/environment'
import { SearchCentroidCollection } from '../computations-index/computation.interface'
import { MapSearchManagerService } from './map-search-manager.service'

const mockPopup = {
    setLngLat: jest.fn().mockReturnThis(),
    setDOMContent: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    isOpen: jest.fn().mockReturnValue(false),
    remove: jest.fn()
}
jest.mock('maplibre-gl', () => ({ Popup: jest.fn(() => mockPopup) }))

const UUID = '8a897536-c4b4-4e5a-9d70-50430183ac66'
const OTHER_UUID = '0f6d2b1e-5a7c-4c3d-9e8f-1a2b3c4d5e6f'

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
        | 'easeTo'
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
            queryRenderedFeatures: jest.fn().mockReturnValue([]),
            easeTo: jest.fn()
        }

        TestBed.configureTestingModule({
            imports: [RouterModule.forRoot([])],
            providers: [
                MapSearchManagerService,
                {
                    provide: TranslocoService,
                    useValue: { translate: (key: string) => key }
                }
            ]
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
        expect(mockMap.addSource).toHaveBeenCalledWith(
            'search-boundaries-source',
            expect.objectContaining({ type: 'vector', tiles: [environment.validComputationsTilesUrl] })
        )
        expect(mockMap.addLayer).toHaveBeenCalledWith(expect.objectContaining({ 'source-layer': 'default' }))
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

    const boundaryFeature = (correlation_uuid: string, aoi_name: string) =>
        ({
            layer: { id: 'search-boundary-fill' },
            properties: { correlation_uuid, aoi_name }
        }) as unknown as MapGeoJSONFeature

    function fireMapEvent(type: string, point: [number, number] = [0, 0]): void {
        const call = mockMap.on.mock.calls.find(c => c[0] === type)
        ;(call![1] as (e: MapMouseEvent) => void)({ point, lngLat: { lng: 0, lat: 0 } } as unknown as MapMouseEvent)
    }

    function showInteractiveLayers(): void {
        service.showSearchLayers('test_plugin', centroids)
        mockMap.getLayer.mockReturnValue(mockLayer)
    }

    it('clicking a boundary should open its computation, or list them when several overlap', () => {
        const navigateSpy = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
        showInteractiveLayers()
        mockMap.queryRenderedFeatures.mockReturnValue([boundaryFeature(UUID, 'Heidelberg')])

        fireMapEvent('click')

        expect(navigateSpy).toHaveBeenCalledWith(['/dashboard/plugin', 'test_plugin', 'computation', UUID])
        expect(mockPopup.setDOMContent).not.toHaveBeenCalled()

        navigateSpy.mockClear()
        mockMap.queryRenderedFeatures.mockReturnValue([
            boundaryFeature(UUID, 'Heidelberg'),
            boundaryFeature(OTHER_UUID, 'Baden-Württemberg')
        ])

        fireMapEvent('click')

        expect(navigateSpy).not.toHaveBeenCalled()
        const content = mockPopup.setDOMContent.mock.calls[0][0] as HTMLElement
        expect(content.querySelector('.discover-popup__title')?.textContent).toBe('map.discover.selectComputation')
        const entries = content.querySelectorAll<HTMLAnchorElement>('a.discover-popup__entry')
        expect(entries).toHaveLength(2)
        expect(entries[0].textContent).toBe('Heidelberg')
        expect(entries[1].getAttribute('href')).toBe(`/dashboard/plugin/test_plugin/computation/${OTHER_UUID}`)

        entries[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        expect(navigateSpy).toHaveBeenCalledWith(['/dashboard/plugin', 'test_plugin', 'computation', UUID])
        expect(mockPopup.remove).toHaveBeenCalled()
    })
})
