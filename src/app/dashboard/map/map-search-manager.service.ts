import { Injectable } from '@angular/core'
import type { Point } from 'geojson'
import type {
    AddLayerObject,
    ExpressionSpecification,
    GeoJSONSource,
    LngLatLike,
    MapGeoJSONFeature,
    MapLayerMouseEvent,
    MapMouseEvent,
    Map as MaplibreMap,
    PaddingOptions,
    PointLike
} from 'maplibre-gl'
import { Popup } from 'maplibre-gl'
import { AoiFeatureProperties, SearchCentroidCollection } from '../computations-index/computation.interface'

// Fallback when a feature carries no minzoom
// TODO: Restore to original values (10 & 9 respectively) once the tile server is active
const DEFAULT_FEATURE_MIN_ZOOM = 21
const CLUSTER_MAX_ZOOM = 20

// Floor for the boundary layers so world-spanning tiles aren't fetched at low zooms
// const BOUNDARY_LAYER_MIN_ZOOM = 4

// Per-feature zoom at which the boundary polygon takes over from the centroid
const FEATURE_MIN_ZOOM: ExpressionSpecification = ['coalesce', ['get', ''], DEFAULT_FEATURE_MIN_ZOOM]

// const BOUNDARY_SOURCE_LAYER = 'tiles.aoi_boundary'

const CENTROID_SOURCE_ID = 'search-centroids-source'
const BOUNDARY_SOURCE_ID = 'search-boundaries-source'

const CLUSTER_LAYER_ID = 'search-clusters'
const CLUSTER_COUNT_LAYER_ID = 'search-cluster-count'
const UNCLUSTERED_LAYER_ID = 'search-unclustered-point'
const BOUNDARY_FILL_LAYER_ID = 'search-boundary-fill'
// const BOUNDARY_CASING_LAYER_ID = 'search-boundary-casing'
// const BOUNDARY_LINE_LAYER_ID = 'search-boundary-line'

const INTERACTIVE_LAYER_IDS = [CLUSTER_LAYER_ID, UNCLUSTERED_LAYER_ID]

// Boundary layers first so clusters/points render on top of the fills
const SEARCH_LAYERS: AddLayerObject[] = [
    // {
    //     id: BOUNDARY_FILL_LAYER_ID,
    //     type: 'fill',
    //     source: BOUNDARY_SOURCE_ID,
    //     'source-layer': BOUNDARY_SOURCE_LAYER,
    //     minzoom: BOUNDARY_LAYER_MIN_ZOOM,
    //     paint: {
    //         'fill-color': '#3388ff',
    //         'fill-opacity': 0.15
    //     }
    // },
    // {
    //     id: BOUNDARY_CASING_LAYER_ID,
    //     type: 'line',
    //     source: BOUNDARY_SOURCE_ID,
    //     'source-layer': BOUNDARY_SOURCE_LAYER,
    //     minzoom: BOUNDARY_LAYER_MIN_ZOOM,
    //     paint: {
    //         'line-color': '#ffffff',
    //         'line-width': 4,
    //         'line-opacity': 0.7
    //     }
    // },
    // {
    //     id: BOUNDARY_LINE_LAYER_ID,
    //     type: 'line',
    //     source: BOUNDARY_SOURCE_ID,
    //     'source-layer': BOUNDARY_SOURCE_LAYER,
    //     minzoom: BOUNDARY_LAYER_MIN_ZOOM,
    //     paint: {
    //         'line-color': '#3388ff',
    //         'line-width': 2,
    //         'line-opacity': 0.9
    //     }
    // },
    {
        id: CLUSTER_LAYER_ID,
        type: 'circle',
        source: CENTROID_SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': ['step', ['get', 'point_count'], '#1a9c9c', 10, '#008080', 50, '#1e5a8a'],
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    },
    {
        id: CLUSTER_COUNT_LAYER_ID,
        type: 'symbol',
        source: CENTROID_SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['noto_sans_bold'],
            'text-size': 12,
            'text-allow-overlap': true
        },
        paint: {
            'text-color': '#ffffff'
        }
    },
    {
        id: UNCLUSTERED_LAYER_ID,
        type: 'circle',
        source: CENTROID_SOURCE_ID,
        // Strict < pairs with the boundary filter's inclusive >=: dot below minzoom, polygon from minzoom on
        filter: ['all', ['!', ['has', 'point_count']], ['<', ['zoom'], FEATURE_MIN_ZOOM]],
        paint: {
            'circle-color': '#008080',
            'circle-radius': 7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    }
]

// Guards the popup against tile features whose attributes don't match the centroid schema
const isAoiFeatureProperties = (props: object): props is AoiFeatureProperties =>
    'correlation_uuid' in props && typeof props.correlation_uuid === 'string'

const ALL_LAYER_IDS = SEARCH_LAYERS.map(layer => layer.id)
// const BOUNDARY_LAYER_IDS = [BOUNDARY_FILL_LAYER_ID, BOUNDARY_CASING_LAYER_ID, BOUNDARY_LINE_LAYER_ID]

@Injectable({
    providedIn: 'root'
})
export class MapSearchManagerService {
    private map?: MaplibreMap
    private popup?: Popup
    private state?: { pluginId: string; centroids: SearchCentroidCollection }
    private visible = false
    private getPadding?: () => PaddingOptions
    private expandingClusterId?: number
    private styleReady = false

    setMap(map: MaplibreMap, getPadding?: () => PaddingOptions): void {
        this.map = map
        this.getPadding = getPadding
        this.styleReady = map.isStyleLoaded() === true
        map.on('styledataloading', () => (this.styleReady = false))
        map.on('style.load', () => {
            this.styleReady = true
            this.syncMapLayers()
        })

        map.on('click', this.onMapClick)
        map.on('dblclick', CLUSTER_LAYER_ID, this.preventMapDefault)
        map.on('dblclick', UNCLUSTERED_LAYER_ID, this.preventMapDefault)

        this.syncMapLayers()
    }

    showSearchLayers(pluginId: string, centroids: SearchCentroidCollection): void {
        this.state = { pluginId, centroids }
        this.visible = true
        this.syncMapLayers()
    }

    hideSearchLayers(): void {
        this.visible = false
        this.popup?.remove()
        this.syncMapLayers()
    }

    clearSearchLayers(): void {
        this.state = undefined
        this.hideSearchLayers()
    }

    isInteractiveFeatureAt(point: PointLike): boolean {
        return this.interactiveFeaturesAt(point).length > 0
    }

    private interactiveFeaturesAt(point: PointLike): MapGeoJSONFeature[] {
        const map = this.map
        if (!map || !this.visible || !map.getLayer(CLUSTER_LAYER_ID)) return []
        return map.queryRenderedFeatures(point, { layers: INTERACTIVE_LAYER_IDS })
    }

    private syncMapLayers(): void {
        const map = this.map
        if (!map || !this.styleReady) return

        if (!this.state) {
            this.removeLayersAndSources(map)
            return
        }

        if (!this.visible) {
            this.setLayerVisibility(map, 'none')
            return
        }

        const { centroids } = this.state

        const centroidSource = map.getSource(CENTROID_SOURCE_ID) as GeoJSONSource | undefined
        if (centroidSource) {
            centroidSource.setData(centroids)
        } else {
            map.addSource(CENTROID_SOURCE_ID, {
                type: 'geojson',
                data: centroids,
                cluster: true,
                clusterMaxZoom: CLUSTER_MAX_ZOOM,
                clusterRadius: 50
            })
        }

        // if (!map.getSource(BOUNDARY_SOURCE_ID)) {
        //     map.addSource(BOUNDARY_SOURCE_ID, {
        //         type: 'vector',
        //         tiles: [`${environment.validComputationsTilesUrl}/${BOUNDARY_SOURCE_LAYER}/{z}/{x}/{y}.pbf`],
        //         minzoom: 0,
        //         maxzoom: 22
        //     })
        // }

        if (!map.getLayer(BOUNDARY_FILL_LAYER_ID)) {
            SEARCH_LAYERS.forEach(layer => map.addLayer(layer))
        }

        // const boundaryFilter: FilterSpecification = [
        //     'all',
        //     ['==', ['get', 'plugin_id'], pluginId],
        //     ['>=', ['zoom'], FEATURE_MIN_ZOOM]
        // ]
        // BOUNDARY_LAYER_IDS.forEach(layerId => map.setFilter(layerId, boundaryFilter))
        this.setLayerVisibility(map, 'visible')
    }

    private setLayerVisibility(map: MaplibreMap, visibility: 'visible' | 'none'): void {
        if (!map.getLayer(BOUNDARY_FILL_LAYER_ID)) return
        ALL_LAYER_IDS.forEach(layerId => map.setLayoutProperty(layerId, 'visibility', visibility))
    }

    private removeLayersAndSources(map: MaplibreMap): void {
        if (map.getLayer(BOUNDARY_FILL_LAYER_ID)) {
            ALL_LAYER_IDS.forEach(layerId => map.removeLayer(layerId))
        }
        for (const sourceId of [CENTROID_SOURCE_ID, BOUNDARY_SOURCE_ID]) {
            if (map.getSource(sourceId)) {
                map.removeSource(sourceId)
            }
        }
    }

    private readonly preventMapDefault = (e: MapLayerMouseEvent) => e.preventDefault()

    private readonly onMapClick = (e: MapMouseEvent) => {
        const map = this.map
        const features = this.interactiveFeaturesAt(e.point)
        if (!map || features.length === 0) return

        // A cluster bubble above everything wins the click outright
        if (features[0].layer.id === CLUSTER_LAYER_ID) {
            void this.expandCluster(map, features[0])
            return
        }

        // De-dupe by UUID: during a zoom's tile swap an AoI can briefly render as both dot and polygon
        const entries = new Map(
            features
                .filter(feature => feature.layer.id !== CLUSTER_LAYER_ID)
                .map(feature => feature.properties)
                .filter(isAoiFeatureProperties)
                .map((props): [string, AoiFeatureProperties] => [props.correlation_uuid, props])
        )
        if (entries.size === 0) return
        this.openPopup(map, e.lngLat, [...entries.values()])
    }

    private async expandCluster(map: MaplibreMap, feature: MapGeoJSONFeature): Promise<void> {
        const source = map.getSource(CENTROID_SOURCE_ID) as GeoJSONSource | undefined
        const clusterId = feature.properties['cluster_id'] as number | undefined
        if (!source || clusterId === undefined || this.expandingClusterId === clusterId) return
        this.expandingClusterId = clusterId
        map.once('idle', () => (this.expandingClusterId = undefined))
        try {
            const zoom = await source.getClusterExpansionZoom(clusterId)
            map.easeTo({
                center: (feature.geometry as Point).coordinates as [number, number],
                zoom: zoom + 0.25,
                padding: this.getPadding?.(),
                duration: 800
            })
        } catch {
            this.expandingClusterId = undefined
        }
    }

    private openPopup(map: MaplibreMap, lngLat: LngLatLike, entries: AoiFeatureProperties[]): void {
        this.popup?.remove()

        const content = document.createElement('div')
        content.className = 'discover-popup__content'
        entries.forEach((entry, index) => {
            if (index > 0) {
                const divider = document.createElement('hr')
                divider.className = 'discover-popup__divider'
                content.append(divider)
            }
            const title = document.createElement('strong')
            title.className = 'discover-popup__title'
            title.textContent = entry.aoi_name || entry.correlation_uuid
            const uuid = document.createElement('span')
            uuid.className = 'discover-popup__uuid'
            uuid.textContent = entry.correlation_uuid
            content.append(title, uuid)
        })

        this.popup = new Popup({
            closeButton: false,
            closeOnClick: true,
            offset: 12,
            maxWidth: '280px',
            className: 'smooth-popup discover-popup'
        })
            .setLngLat(lngLat)
            .setDOMContent(content)
            .addTo(map)
    }
}
