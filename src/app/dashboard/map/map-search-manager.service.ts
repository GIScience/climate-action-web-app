import { Injectable, inject } from '@angular/core'
import { Router } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import type { Point } from 'geojson'
import type {
    AddLayerObject,
    ExpressionSpecification,
    FilterSpecification,
    GeoJSONSource,
    LngLatLike,
    MapGeoJSONFeature,
    MapLayerMouseEvent,
    MapMouseEvent,
    Map as MaplibreMap,
    PaddingOptions,
    PointLike,
    PopupOptions
} from 'maplibre-gl'
import { Popup } from 'maplibre-gl'
import { environment } from 'src/environments/environment'
import { AoiFeatureProperties, SearchCentroidCollection } from '../computations-index/computation.interface'
import { computationRouteCommands } from '../share/share.service'

// Fallback when a feature carries no minzoom
const DEFAULT_FEATURE_MIN_ZOOM = 10
const CLUSTER_MAX_ZOOM = 9

// Added to a target zoom so the camera lands clearly past the integer threshold
// at which a cluster splits / a boundary polygon replaces its centroid
const ZOOM_NUDGE = 0.25

// Floor for the boundary layers so world-spanning tiles aren't fetched at low zooms
const BOUNDARY_LAYER_MIN_ZOOM = 4

// Per-feature zoom at which the boundary polygon takes over from the centroid
const FEATURE_MIN_ZOOM: ExpressionSpecification = ['coalesce', ['get', 'min_zoom'], DEFAULT_FEATURE_MIN_ZOOM]

const BOUNDARY_SOURCE_LAYER = 'tiles.aoi_boundary'

const CENTROID_SOURCE_ID = 'search-centroids-source'
const BOUNDARY_SOURCE_ID = 'search-boundaries-source'

const CLUSTER_LAYER_ID = 'search-clusters'
const CLUSTER_COUNT_LAYER_ID = 'search-cluster-count'
const UNCLUSTERED_LAYER_ID = 'search-unclustered-point'
const BOUNDARY_FILL_LAYER_ID = 'search-boundary-fill'
const BOUNDARY_HOVER_LAYER_ID = 'search-boundary-hover'
const BOUNDARY_CASING_LAYER_ID = 'search-boundary-casing'
const BOUNDARY_LINE_LAYER_ID = 'search-boundary-line'

const INTERACTIVE_LAYER_IDS = [CLUSTER_LAYER_ID, UNCLUSTERED_LAYER_ID, BOUNDARY_FILL_LAYER_ID]
// Plugin-filtered boundary layers (the hover layer is filtered by UUID instead)
const BOUNDARY_LAYER_IDS = [BOUNDARY_FILL_LAYER_ID, BOUNDARY_CASING_LAYER_ID, BOUNDARY_LINE_LAYER_ID]

const boundaryFilter = (pluginId: string): FilterSpecification => [
    'all',
    ['==', ['get', 'plugin_id'], pluginId],
    ['>=', ['zoom'], FEATURE_MIN_ZOOM]
]

// Tile features carry no ids, so the hover highlight is a filter on the (unique) UUID instead of feature-state
const hoverFilter = (uuids: string[]): FilterSpecification => ['in', ['get', 'correlation_uuid'], ['literal', uuids]]

const BOUNDARY_LAYER_BASE = {
    source: BOUNDARY_SOURCE_ID,
    'source-layer': BOUNDARY_SOURCE_LAYER,
    minzoom: BOUNDARY_LAYER_MIN_ZOOM
} as const

// Boundary layers first so clusters/points render on top of the fills
const SEARCH_LAYERS: AddLayerObject[] = [
    {
        id: BOUNDARY_FILL_LAYER_ID,
        type: 'fill',
        ...BOUNDARY_LAYER_BASE,
        paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.15 }
    },
    {
        id: BOUNDARY_HOVER_LAYER_ID,
        type: 'fill',
        ...BOUNDARY_LAYER_BASE,
        filter: hoverFilter([]),
        paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.3 }
    },
    {
        id: BOUNDARY_CASING_LAYER_ID,
        type: 'line',
        ...BOUNDARY_LAYER_BASE,
        paint: { 'line-color': '#ffffff', 'line-width': 4, 'line-opacity': 0.7 }
    },
    {
        id: BOUNDARY_LINE_LAYER_ID,
        type: 'line',
        ...BOUNDARY_LAYER_BASE,
        paint: { 'line-color': '#3388ff', 'line-width': 2, 'line-opacity': 0.9 }
    },
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
        paint: { 'text-color': '#ffffff' }
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
const ALL_LAYER_IDS = SEARCH_LAYERS.map(layer => layer.id)

// Guards against tile features whose attributes don't match the centroid schema
const isAoiFeatureProperties = (props: object): props is AoiFeatureProperties =>
    'correlation_uuid' in props && typeof props.correlation_uuid === 'string'

// A polygon split across tiles comes back as several fragments with the same UUID
const uniqueAoiEntries = (features: MapGeoJSONFeature[]): AoiFeatureProperties[] => [
    ...new Map(
        features
            .map(feature => feature.properties)
            .filter(isAoiFeatureProperties)
            .map((props): [string, AoiFeatureProperties] => [props.correlation_uuid, props])
    ).values()
]

const createElement = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className = '',
    textContent = ''
): HTMLElementTagNameMap[K] => Object.assign(document.createElement(tag), { className, textContent })

const createPopup = (className: string, options: PopupOptions): Popup =>
    new Popup({ closeButton: false, offset: 12, className: `smooth-popup ${className}`, ...options })

@Injectable({
    providedIn: 'root'
})
export class MapSearchManagerService {
    private router = inject(Router)
    private translocoService = inject(TranslocoService)
    private map?: MaplibreMap
    private popup?: Popup
    private tooltip?: Popup
    private hoveredUuids: string[] = []
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
        map.on('mousemove', this.onMapMove)
        map.on('mouseout', this.clearHover)
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
        this.dismissOverlays()
        this.syncMapLayers()
    }

    clearSearchLayers(): void {
        this.state = undefined
        this.hideSearchLayers()
    }

    isInteractiveFeatureAt(point: PointLike): boolean {
        return this.featuresAt(point, INTERACTIVE_LAYER_IDS).length > 0
    }

    private layersAdded(map: MaplibreMap): boolean {
        return !!map.getLayer(BOUNDARY_FILL_LAYER_ID)
    }

    private featuresAt(point: PointLike, layers: string[]): MapGeoJSONFeature[] {
        const map = this.map
        if (!map || !this.visible || !this.layersAdded(map)) return []
        return map.queryRenderedFeatures(point, { layers })
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

        const { pluginId, centroids } = this.state

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

        if (!map.getSource(BOUNDARY_SOURCE_ID)) {
            map.addSource(BOUNDARY_SOURCE_ID, {
                type: 'vector',
                tiles: [`${environment.validComputationsTilesUrl}/${BOUNDARY_SOURCE_LAYER}/{z}/{x}/{y}.pbf`],
                minzoom: 0,
                maxzoom: 22
            })
        }

        if (!this.layersAdded(map)) {
            SEARCH_LAYERS.forEach(layer => map.addLayer(layer))
        }

        BOUNDARY_LAYER_IDS.forEach(layerId => map.setFilter(layerId, boundaryFilter(pluginId)))
        this.setLayerVisibility(map, 'visible')
    }

    private setLayerVisibility(map: MaplibreMap, visibility: 'visible' | 'none'): void {
        if (!this.layersAdded(map)) return
        ALL_LAYER_IDS.forEach(layerId => map.setLayoutProperty(layerId, 'visibility', visibility))
    }

    private removeLayersAndSources(map: MaplibreMap): void {
        if (this.layersAdded(map)) {
            ALL_LAYER_IDS.forEach(layerId => map.removeLayer(layerId))
        }
        for (const sourceId of [CENTROID_SOURCE_ID, BOUNDARY_SOURCE_ID]) {
            if (map.getSource(sourceId)) {
                map.removeSource(sourceId)
            }
        }
    }

    private readonly preventMapDefault = (e: MapLayerMouseEvent) => e.preventDefault()

    // Topmost feature first: a cluster bubble or centroid dot above a polygon wins the click
    private readonly onMapClick = (e: MapMouseEvent) => {
        const map = this.map
        const features = this.featuresAt(e.point, INTERACTIVE_LAYER_IDS)
        if (!map || features.length === 0 || !this.state) return

        const top = features[0]
        if (top.layer.id === CLUSTER_LAYER_ID) {
            void this.expandCluster(map, top)
            return
        }
        if (top.layer.id === UNCLUSTERED_LAYER_ID) {
            // Zoom in to where the dot gives way to its boundary polygon
            this.easeTo(map, top, (top.properties['min_zoom'] as number | undefined) ?? DEFAULT_FEATURE_MIN_ZOOM)
            return
        }

        const entries = uniqueAoiEntries(features)
        if (entries.length === 1) {
            this.openComputation(this.state.pluginId, entries[0])
        } else if (entries.length > 1) {
            // Overlapping AoIs (e.g. nested regions): let the user pick
            this.openPopup(map, e.lngLat, this.state.pluginId, entries)
        }
    }

    private readonly onMapMove = (e: MapMouseEvent) => {
        const map = this.map
        if (!map) return
        const entries = this.popup?.isOpen() ? [] : uniqueAoiEntries(this.featuresAt(e.point, [BOUNDARY_FILL_LAYER_ID]))
        if (entries.length === 0) {
            this.clearHover()
            return
        }

        const uuids = entries.map(entry => entry.correlation_uuid)
        if (uuids.join() === this.hoveredUuids.join()) {
            this.tooltip?.setLngLat(e.lngLat)
            return
        }

        this.hoveredUuids = uuids
        map.setFilter(BOUNDARY_HOVER_LAYER_ID, hoverFilter(uuids))
        const key = entries.length === 1 ? 'map.discover.viewComputation' : 'map.discover.multipleComputations'
        const content = createElement('div')
        content.append(
            this.translocoService.translate(key),
            createElement('br'),
            createElement('strong', '', entries.map(entry => entry.aoi_name).join(', '))
        )
        this.tooltip ??= createPopup('discover-tooltip', { closeOnClick: false })
        this.tooltip.setLngLat(e.lngLat).setDOMContent(content).addTo(map)
    }

    private readonly clearHover = () => {
        if (this.hoveredUuids.length === 0) return
        this.hoveredUuids = []
        this.tooltip?.remove()
        if (this.map && this.layersAdded(this.map)) {
            this.map.setFilter(BOUNDARY_HOVER_LAYER_ID, hoverFilter([]))
        }
    }

    private dismissOverlays(): void {
        this.popup?.remove()
        this.clearHover()
    }

    private openComputation(pluginId: string, entry: AoiFeatureProperties): void {
        this.dismissOverlays()
        this.router.navigate(computationRouteCommands(pluginId, entry.correlation_uuid))
    }

    private async expandCluster(map: MaplibreMap, feature: MapGeoJSONFeature): Promise<void> {
        const source = map.getSource(CENTROID_SOURCE_ID) as GeoJSONSource | undefined
        const clusterId = feature.properties['cluster_id'] as number | undefined
        if (!source || clusterId === undefined || this.expandingClusterId === clusterId) return
        this.expandingClusterId = clusterId
        map.once('idle', () => (this.expandingClusterId = undefined))
        try {
            this.easeTo(map, feature, await source.getClusterExpansionZoom(clusterId))
        } catch {
            this.expandingClusterId = undefined
        }
    }

    private easeTo(map: MaplibreMap, feature: MapGeoJSONFeature, zoom: number): void {
        map.easeTo({
            center: (feature.geometry as Point).coordinates as [number, number],
            zoom: zoom + ZOOM_NUDGE,
            padding: this.getPadding?.(),
            duration: 800
        })
    }

    private openPopup(map: MaplibreMap, lngLat: LngLatLike, pluginId: string, entries: AoiFeatureProperties[]): void {
        this.dismissOverlays()

        const links = entries.map(entry => {
            const link = createElement('a', 'discover-popup__entry', entry.aoi_name)
            link.href = this.router.serializeUrl(
                this.router.createUrlTree(computationRouteCommands(pluginId, entry.correlation_uuid))
            )
            link.addEventListener('click', event => {
                event.preventDefault()
                this.openComputation(pluginId, entry)
            })
            return link
        })
        const title = this.translocoService.translate('map.discover.selectComputation')
        const content = createElement('div', 'discover-popup__content')
        content.append(createElement('div', 'discover-popup__title', title), ...links)

        this.popup = createPopup('discover-popup', { closeOnClick: true, maxWidth: '280px' })
            .setLngLat(lngLat)
            .setDOMContent(content)
            .addTo(map)
    }
}
