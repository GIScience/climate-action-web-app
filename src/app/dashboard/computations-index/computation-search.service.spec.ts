import { TestBed } from '@angular/core/testing'
import { of, Subject } from 'rxjs'
import { MapSearchManagerService } from '../map/map-search-manager.service'
import { PluginService } from '../plugin/plugin.service'
import { ComputationSearchService } from './computation-search.service'
import { SearchCentroidCollection, SearchEntry, SearchPage } from './computation.interface'

function createEntry(id: string): SearchEntry {
    return {
        correlation_uuid: id,
        request_ts: new Date('2023-09-27T16:42:52+01:00'),
        plugin_id: 'test_plugin',
        aoi_name: `AOI ${id}`
    }
}

function createPage(items: SearchEntry[], nextPage: string | null = null): SearchPage {
    return {
        items,
        current_page: null,
        current_page_backwards: null,
        previous_page: null,
        next_page: nextPage
    }
}

const emptyCentroids: SearchCentroidCollection = { type: 'FeatureCollection', features: [] }

describe('ComputationSearchService', () => {
    let service: ComputationSearchService
    let mockPluginService: Partial<PluginService>
    let mockmapSearchManager: Partial<MapSearchManagerService>

    const loadedIds = () => service.computations().map(computation => computation.correlation_uuid)

    beforeEach(() => {
        mockPluginService = {
            getSearch: jest.fn().mockReturnValue(of(createPage([]))),
            getSearchCentroids: jest.fn().mockReturnValue(of(emptyCentroids))
        }
        mockmapSearchManager = {
            showSearchLayers: jest.fn(),
            hideSearchLayers: jest.fn(),
            clearSearchLayers: jest.fn()
        }

        TestBed.configureTestingModule({
            providers: [
                ComputationSearchService,
                { provide: PluginService, useValue: mockPluginService },
                { provide: MapSearchManagerService, useValue: mockmapSearchManager }
            ]
        })

        service = TestBed.inject(ComputationSearchService)
    })

    it('should page through the search with the cursor and skip duplicate entries', () => {
        mockPluginService.getSearch = jest
            .fn()
            .mockImplementation((_pluginId: string, cursor: string | null) =>
                cursor === null
                    ? of(createPage([createEntry('a')], 'cursor-1'))
                    : of(createPage([createEntry('a'), createEntry('b')]))
            )

        service.ensureLoaded('test_plugin')

        expect(mockPluginService.getSearch).toHaveBeenCalledWith('test_plugin', null, 10)
        expect(loadedIds()).toEqual(['a'])
        expect(service.hasMore()).toBe(true)

        service.loadMore()

        expect(mockPluginService.getSearch).toHaveBeenLastCalledWith('test_plugin', 'cursor-1', 10)
        expect(loadedIds()).toEqual(['a', 'b'])
        expect(service.hasMore()).toBe(false)

        service.loadMore()

        expect(mockPluginService.getSearch).toHaveBeenCalledTimes(2)
    })

    it('should cache the loaded page until marked stale or the plugin changes', () => {
        service.ensureLoaded('plugin_one')
        service.ensureLoaded('plugin_one')
        expect(mockPluginService.getSearch).toHaveBeenCalledTimes(1)

        service.markStale()
        service.ensureLoaded('plugin_one')
        expect(mockPluginService.getSearch).toHaveBeenCalledTimes(2)

        service.ensureLoaded('plugin_two')
        expect(mockPluginService.getSearch).toHaveBeenCalledTimes(3)
        expect(mockPluginService.getSearch).toHaveBeenLastCalledWith('plugin_two', null, 10)
    })

    it('showSearchLayers should load centroids once and forward them to the map manager', () => {
        service.showSearchLayers('test_plugin')
        service.showSearchLayers('test_plugin')

        expect(mockPluginService.getSearchCentroids).toHaveBeenCalledTimes(1)
        expect(mockmapSearchManager.showSearchLayers).toHaveBeenCalledTimes(2)
        expect(mockmapSearchManager.showSearchLayers).toHaveBeenCalledWith('test_plugin', emptyCentroids)
    })

    it('hideSearchLayers should hide the layers and skip displaying late centroid responses', () => {
        const centroids$ = new Subject<SearchCentroidCollection>()
        mockPluginService.getSearchCentroids = jest.fn().mockReturnValue(centroids$)

        service.showSearchLayers('test_plugin')
        service.hideSearchLayers()
        centroids$.next(emptyCentroids)

        expect(mockmapSearchManager.hideSearchLayers).toHaveBeenCalled()
        expect(mockmapSearchManager.showSearchLayers).not.toHaveBeenCalled()
    })
})
