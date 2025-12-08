import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'
import { StorageService } from '@app/storage.service'
import { resolveLocalizedName } from '@app/utils/localized-name.utils'
import { TranslocoService } from '@jsverse/transloco'
import area from '@turf/area'
import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw'
import type {
    BBox,
    FeatureCollection,
    Feature as GeoJSONFeature,
    Point as GeoJSONPoint,
    MultiPolygon,
    Position
} from 'geojson'
import { fromUrl as geoTiffFromUrl } from 'geotiff'
import maplibregl, {
    GeoJSONSource,
    IControl,
    LngLatBounds,
    LngLatLike,
    Map,
    Marker,
    Popup,
    StyleSpecification
} from 'maplibre-gl'
import { updateMaplibreLocale } from 'maplibre-ui-translations'
import { Collection } from 'ol'
import { Coordinate } from 'ol/coordinate'
import { Extent } from 'ol/extent'
import Feature from 'ol/Feature'
import { Geometry, MultiPolygon as OLMultiPolygon, Polygon as OLPolygon } from 'ol/geom'
import { BehaviorSubject, Observable } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import { environment } from 'src/environments/environment'
import { PluginService } from '../plugin/plugin.service'
import { MapDrawingService } from './map-drawing.service'
import { MapControlsUtils } from './utils/map-controls.utils'
import { MapConvertMeasureUtils } from './utils/map-convert-measure.utils'
import { MapGeoJsonUtils } from './utils/map-geojson.utils'
import { MapGeoTiffUtils } from './utils/map-geotiff.utils'
import { MapGlobeUtils } from './utils/map-globe.utils'
import { MapStyle, MapStyleSwitcherControl } from './utils/map-style-switcher.utils'

export enum BasemapStyleName {
    Colorful = 'Colorful',
    Graybeard = 'Graybeard',
    EsriWorldImagery = 'ESRI World Imagery'
}

const ALL_BASEMAPS: readonly BasemapStyleName[] = [
    BasemapStyleName.Colorful,
    BasemapStyleName.Graybeard,
    BasemapStyleName.EsriWorldImagery
] as const

function isBasemapStyleName(value: string): value is BasemapStyleName {
    return (ALL_BASEMAPS as readonly string[]).includes(value)
}

export interface AutocompleteFeature extends GeoJSONFeature<GeoJSONPoint> {
    properties: {
        // Required properties
        label: string
        name: string

        // OpenRouteService specific properties
        layer?: string
        locality?: string
        county?: string
        region?: string
        country?: string

        // Optional metadata
        id?: string | number

        // Allow additional properties from API response
        [key: string]: string | number | boolean | null | undefined
    }
    bbox?: BBox
}

interface VectorLayerGroup {
    layerIds: string[]
    sourceId: string
    name: string
    visible?: boolean
}

interface RasterLayer {
    layerId: string
    sourceId: string
    visible?: boolean
}

@Injectable({
    providedIn: 'root'
})
export class MapService {
    private pluginService = inject(PluginService)
    private http = inject(HttpClient)
    storageService = inject(StorageService)
    private translocoService = inject(TranslocoService)
    private router = inject(Router, { optional: true })
    private mapDrawingService = inject(MapDrawingService, { optional: true })

    // Core Map Instance
    map: Map | undefined
    mapId: string = 'main-map'
    isOnLanding: boolean = true

    // UI Controls & Overlays
    mapPopUp: Popup | undefined
    featureHoverOverlay: Popup | undefined
    layerSwitcherControl: MapStyleSwitcherControl | undefined
    layerSwitcherCollapsed: boolean = false
    currentBasemapStyle: BasemapStyleName = BasemapStyleName.Colorful
    private styleChangeSubject = new BehaviorSubject<BasemapStyleName>(BasemapStyleName.Colorful)
    public styleChange$ = this.styleChangeSubject.asObservable()

    // Window & Display Properties
    windowWidth?: number
    windowResolution?: number

    // Marker Management
    markerLayer: Marker[] = []
    markerFeatures: AutocompleteFeature[] = []

    // Feature Selection
    selectedOlFeatures: Collection<Feature<Geometry>> = new Collection([])
    selectedGeoJSONFeatures: GeoJSONFeature[] = [] // Track GeoJSON features for MapLibre

    // Layer Management
    focusedLayer: { aoiLayerId: string; fowLayerId: string; sourceId: string } | undefined
    regionLayer: RasterLayer | undefined
    selectedRegionLayer: VectorLayerGroup | undefined
    geojsonLayer: VectorLayerGroup | undefined

    // Drawing & Measurement Tools
    terraDrawControl: MaplibreTerradrawControl | undefined

    private readonly orsAPIKey = environment.orsAPIKey
    static readonly sqmToSqkmFactor = 1 / 1000000
    private static readonly HEIDELBERG_COORDS: [number, number] = [8.6759928, 49.4187355]

    constructor() {
        this.isOnLanding = this.router?.url === '/dashboard'

        if (this.router) {
            this.router.events
                .pipe(filter(event => event instanceof NavigationEnd))
                .subscribe((event: NavigationEnd) => {
                    this.handleRouteChange(event.urlAfterRedirects)
                })
        }

        this.pluginService.computeState$.subscribe(value => {
            if (value === 'compute-ready') {
                this.enableComputeLayers()
            } else if (value === 'inactive') {
                this.removeComputeLayers()
            }
        })

        if (this.mapDrawingService?.drawnFeatures$) {
            this.mapDrawingService.drawnFeatures$.subscribe(drawnFeatures => {
                this.selectedOlFeatures.clear()
                this.selectedGeoJSONFeatures = []

                drawnFeatures.forEach(({ geoJsonFeature, olFeature }) => {
                    this.selectedOlFeatures.push(olFeature)
                    this.selectedGeoJSONFeatures.push(geoJsonFeature)
                })

                if (this.selectedRegionLayer && this.map) {
                    const source = this.map.getSource(this.selectedRegionLayer.sourceId) as GeoJSONSource
                    source?.setData({ type: 'FeatureCollection', features: this.selectedGeoJSONFeatures })
                }
            })
        }

        this.translocoService.langChanges$.subscribe(lang => {
            if (this.map) {
                updateMaplibreLocale(this.map, lang)
            }
        })
    }

    initMap(targetId: string, isReportMap: boolean = false) {
        this.mapId = targetId

        const storedStyle = this.storageService.getSelectedMapLayer('')
        this.currentBasemapStyle = isBasemapStyleName(storedStyle) ? storedStyle : BasemapStyleName.Colorful
        this.styleChangeSubject.next(this.currentBasemapStyle)

        this.map = new Map({
            container: targetId,
            style: this.getStyleFor(this.currentBasemapStyle),
            zoom: 3,
            minZoom: 2,
            maxZoom: 20,
            renderWorldCopies: false,
            maxPitch: 85
        })

        updateMaplibreLocale(this.map, this.translocoService.getActiveLang())

        if (maplibregl.getRTLTextPluginStatus() === 'unavailable') {
            maplibregl.setRTLTextPlugin('assets/rtl/mapbox-gl-rtl-text.js', true)
        }

        const navigationControl = new maplibregl.NavigationControl({
            visualizePitch: true,
            visualizeRoll: true
        })
        navigationControl._container.className += ' navigation-controls'
        this.map!.addControl(navigationControl, 'top-right')
        this.map!.addControl(MapControlsUtils.createZoomToZeroControl(this.translocoService), 'top-right')
        this.map!.addControl(new maplibregl.ScaleControl({ maxWidth: 200, unit: 'metric' }), 'top-right')

        this.addLayerSwitcher()

        if (!isReportMap) {
            this.map!.scrollZoom.enable()
        } else {
            this.map!.scrollZoom.disable()
            this.setupReportMapZoomNote()
        }

        this.mapPopUp = new Popup({ closeButton: false, closeOnClick: false })
        this.setupEventHandlers()

        this.map!.on('style.load', () => {
            const isReportMap = this.mapId?.startsWith('report-map-')
            if (!isReportMap) {
                MapGlobeUtils.setupGlobeProjection(this.map!)
            }

            this.setupLayers()

            if (this.isOnLanding) {
                MapGlobeUtils.startSpinning(this.map!, this.isOnLanding)
            } else if (!isReportMap) {
                this.fitToUserLocale().catch(error => console.warn('Failed to fit to user locale on init:', error))
            }
        })

        if (environment.environmentType === 'testing' || environment.environmentType === 'development') {
            ;(window as Window & { map?: Map }).map = this.map
        }
    }

    private setupLayers() {
        if (!this.map) return

        // Layer configuration
        const layers = {
            markers: { sourceId: 'markers' },
            regions: {
                sourceId: 'region-vector-source',
                fillLayerId: 'region-boundaries-fill',
                outlineLayerId: 'region-boundaries-outline',
                sourceLayer: 'default',
                tiles: 'https://maps.heigit.org/vector/tiles/public.admin_boundaries_layer/{z}/{x}/{y}.pbf',
                attribution:
                    'Boundaries © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, Source: <a href="https://osm-boundaries.com" target="_blank">OSM Boundaries Map</a> via <a href="https://ohsome.org" target="_blank">ohsome</a>.'
            },
            selectedRegions: {
                sourceId: 'selected-regions',
                fillLayerId: 'selected-regions-fill',
                outlineLayerId: 'selected-regions-outline'
            }
        }

        // Marker Source
        this.map.addSource(layers.markers.sourceId, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        })

        // Region Vector Tile Source
        this.map.addSource(layers.regions.sourceId, {
            type: 'vector',
            tiles: [layers.regions.tiles],
            minzoom: 0,
            maxzoom: 15,
            attribution: layers.regions.attribution
        })

        // Region boundary fill layer (transparent, used for click detection)
        this.map.addLayer({
            id: layers.regions.fillLayerId,
            type: 'fill',
            source: layers.regions.sourceId,
            'source-layer': layers.regions.sourceLayer,
            paint: {
                'fill-opacity': 0,
                'fill-color': 'transparent'
            },
            layout: { visibility: 'none' }
        })

        // Region boundary outline layer
        this.map.addLayer({
            id: layers.regions.outlineLayerId,
            type: 'line',
            source: layers.regions.sourceId,
            'source-layer': layers.regions.sourceLayer,
            paint: {
                'line-color': [
                    'match',
                    ['get', 'admin_level'],
                    2,
                    '#e78ac3',
                    3,
                    '#4d5fb4',
                    4,
                    '#59b796',
                    5,
                    '#d35d5d',
                    6,
                    '#f39a30',
                    7,
                    '#bd6eb6',
                    8,
                    '#7da5eb',
                    9,
                    '#6ee0b7',
                    10,
                    '#eb7c7c',
                    11,
                    '#ffb982',
                    '#ccc'
                ],
                'line-width': 2
            },
            layout: {
                'line-sort-key': ['-', ['get', 'admin_level']],
                visibility: 'none'
            }
        })

        this.regionLayer = {
            layerId: layers.regions.fillLayerId,
            sourceId: layers.regions.sourceId,
            visible: false
        }

        // Selected Regions Layers
        this.map.addSource(layers.selectedRegions.sourceId, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        })

        this.map.addLayer({
            id: layers.selectedRegions.fillLayerId,
            type: 'fill',
            source: layers.selectedRegions.sourceId,
            paint: { 'fill-color': 'rgba(0, 0, 255, 0.1)', 'fill-outline-color': 'rgba(0, 0, 255, 0.7)' }
        })

        this.map.addLayer({
            id: layers.selectedRegions.outlineLayerId,
            type: 'line',
            source: layers.selectedRegions.sourceId,
            paint: { 'line-color': 'rgba(0, 0, 255, 0.7)', 'line-width': 2 }
        })

        this.selectedRegionLayer = {
            sourceId: layers.selectedRegions.sourceId,
            layerIds: [layers.selectedRegions.fillLayerId, layers.selectedRegions.outlineLayerId],
            name: 'Selected Regions'
        }
    }

    private setupEventHandlers() {
        if (!this.map) return

        this.map.on('mousemove', e => {
            if (!this.map || this.mapDrawingService?.isDrawingModeValue) return

            let showPointer = false

            if (this.regionLayer?.visible) {
                // For vector layers, check if we're hovering over a feature
                const features = this.map.queryRenderedFeatures(e.point, {
                    layers: ['region-boundaries-fill']
                })
                showPointer = features.length > 0
            } else if (this.geojsonLayer) {
                const existingLayers = this.geojsonLayer.layerIds.filter(id => this.map!.getLayer(id))
                if (existingLayers.length > 0) {
                    const features = this.map.queryRenderedFeatures(e.point, { layers: existingLayers })
                    showPointer = features.length > 0
                }
            }

            this.map.getCanvas().style.cursor = showPointer ? 'pointer' : ''
        })

        this.map.on('click', e => {
            this.selectRegions([e.point.x, e.point.y])
        })

        MapGlobeUtils.setupInteractionHandlers(this.map)
    }

    private setupReportMapZoomNote() {
        if (!this.map) return

        const mapElement = this.map.getContainer()
        const noteId = `map-zoom-note-${this.mapId.replace('report-map-', '')}`
        const noteElement = document.getElementById(noteId)

        if (mapElement && noteElement) {
            let hideTimeout: number | null = null

            mapElement.addEventListener('wheel', () => {
                noteElement.classList.add('visible')

                if (hideTimeout) {
                    window.clearTimeout(hideTimeout)
                }

                hideTimeout = window.setTimeout(() => {
                    noteElement.classList.remove('visible')
                    hideTimeout = null
                }, 3000)
            })
        }
    }

    getAutoCompleteSuggestions(query: string): Observable<AutocompleteFeature[]> {
        const orsUrl = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${this.orsAPIKey}&text=${query}&layers=address,venue,neighbourhood,locality,borough,localadmin,county,macrocounty`

        return this.http.get<FeatureCollection>(orsUrl).pipe(
            map(collection => {
                return collection.features
                    .filter(
                        (feature: GeoJSONFeature): feature is AutocompleteFeature => feature.geometry!.type === 'Point'
                    )
                    .map(
                        (feature: GeoJSONFeature): AutocompleteFeature => ({
                            ...feature,
                            geometry: feature.geometry as GeoJSONPoint,
                            // Ensure required properties exist with fallbacks
                            properties: {
                                ...feature.properties,
                                name: feature.properties?.['name'] || 'Unknown location',
                                label:
                                    feature.properties?.['label'] || feature.properties?.['name'] || 'Unknown location'
                            },
                            bbox: feature.bbox
                        })
                    )
            })
        )
    }

    addMarker(feature: AutocompleteFeature) {
        if (!this.map) return

        // Clear existing markers
        this.markerLayer.forEach(marker => marker.remove())
        this.markerLayer = []
        this.markerFeatures = []

        // Get coordinates from the GeoJSON feature
        const coords = (feature.geometry as GeoJSONPoint).coordinates
        if (!coords || coords.length < 2) return

        // Add new marker
        const el = document.createElement('div')
        el.className = 'marker'
        el.style.backgroundImage = 'url(assets/images/map-pin.svg)'
        el.style.width = '30px'
        el.style.height = '30px'
        el.style.backgroundSize = '100%'

        const marker = new Marker({ element: el }).setLngLat([coords[0], coords[1]] as LngLatLike).addTo(this.map)

        this.markerLayer.push(marker)
        this.markerFeatures.push(feature)
    }

    calculateMapPadding() {
        this.windowWidth = window.innerWidth
        this.windowResolution = window.devicePixelRatio
        const horMapPadding = 150 / this.windowResolution

        if (this.windowWidth > 1600) {
            return { top: horMapPadding, right: 100, bottom: horMapPadding, left: 225 }
        } else {
            return { top: horMapPadding, right: 100, bottom: horMapPadding, left: 250 }
        }
    }

    fitToExtent(extent: Extent, options?: maplibregl.FitBoundsOptions) {
        if (!this.map || !extent || extent.length !== 4) return

        // Convert extent from EPSG:3857 to EPSG:4326
        const wgs84Extent = MapConvertMeasureUtils.transformExtentToWgs84(extent)

        // Create bounds from extent [minLng, minLat, maxLng, maxLat]
        const bounds = new LngLatBounds(
            [wgs84Extent[0], wgs84Extent[1]], // southwest
            [wgs84Extent[2], wgs84Extent[3]] // northeast
        )

        // Default options with padding
        const fitOptions = {
            padding: this.calculateMapPadding(),
            animate: false, // Disable animation by default for instant jump
            ...options
        }

        this.map.fitBounds(bounds, fitOptions)
    }

    // Fly to extent with smooth animation - handles coordinates, bounding boxes, and features
    flyToExtent(target: Extent | AutocompleteFeature | LngLatLike, options?: maplibregl.FlyToOptions) {
        if (!this.map) return

        let bounds: LngLatBounds | null = null
        let center: LngLatLike | null = null
        const defaultZoom = 15

        // Handle AutocompleteFeature (from search)
        if (target && typeof target === 'object' && 'geometry' in target) {
            const feature = target as AutocompleteFeature

            if (feature.geometry!.type === 'Point') {
                this.addMarker(feature)
                const coords = (feature.geometry as GeoJSONPoint).coordinates
                if (feature.bbox?.length === 4) {
                    bounds = new LngLatBounds([feature.bbox[0], feature.bbox[1]], [feature.bbox[2], feature.bbox[3]])
                } else if (coords?.length >= 2) {
                    center = [coords[0], coords[1]] as LngLatLike
                }
            }
        }
        // Handle extent array [minX, minY, maxX, maxY] in EPSG:3857
        else if (Array.isArray(target) && target.length === 4) {
            const wgs84Extent = MapConvertMeasureUtils.transformExtentToWgs84(target)
            bounds = new LngLatBounds([wgs84Extent[0], wgs84Extent[1]], [wgs84Extent[2], wgs84Extent[3]])
        }
        // Handle LngLatLike (coordinate pair)
        else if (
            (Array.isArray(target) && target.length === 2) ||
            (typeof target === 'object' && 'lng' in target && 'lat' in target)
        ) {
            center = target as LngLatLike
        }

        // Execute the flyTo animation
        if (bounds) {
            const padding = this.calculateMapPadding()
            const zoom = this.map.cameraForBounds(bounds, { padding })
            if (zoom?.zoom !== undefined) {
                this.map.flyTo({
                    center: zoom.center,
                    zoom: Math.min(zoom.zoom, defaultZoom),
                    bearing: zoom.bearing || 0,
                    duration: 1500,
                    padding,
                    ...options
                })
            }
        } else if (center) {
            this.map.flyTo({ center, zoom: defaultZoom, duration: 1500, ...options })
        }
    }

    highlightAoI(feature: Feature<Geometry>): Extent | null {
        this.removeFocusedLayer()
        const geometry = feature?.getGeometry?.() as OLMultiPolygon | OLPolygon | null
        if (!geometry) return null

        const extent = geometry.getExtent()
        if (!extent?.length) return null

        try {
            const transformCoords = (coords: Coordinate[]) =>
                coords.map(c => MapConvertMeasureUtils.mercatorToWgs84(c[0], c[1]))
            const coords = geometry.getCoordinates()
            const transformedCoordinates: Position[][][] =
                geometry instanceof OLMultiPolygon
                    ? (coords as Coordinate[][][]).map(poly => poly.map(transformCoords))
                    : [(coords as Coordinate[][]).map(transformCoords)]

            const [aoiLayerId, fowLayerId, sourceId] = ['focused-aoi-layer', 'focused-fow-layer', 'focused-source']
            ;[aoiLayerId, fowLayerId].forEach(id => this.map?.getLayer(id) && this.map.removeLayer(id))
            if (this.map?.getSource(sourceId)) this.map.removeSource(sourceId)

            this.map?.addSource(sourceId, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            geometry: { type: 'MultiPolygon', coordinates: transformedCoordinates },
                            properties: { renderStyle: 'AOI' }
                        },
                        this.cutFromGlobalPolygon(geometry)
                    ]
                }
            })

            this.map?.addLayer({
                id: fowLayerId,
                type: 'fill',
                source: sourceId,
                filter: ['==', ['get', 'renderStyle'], 'FoW'],
                paint: { 'fill-color': 'rgba(128, 128, 128, 0.3)', 'fill-outline-color': 'rgba(128, 128, 128, 0.3)' }
            })

            this.map?.addLayer({
                id: aoiLayerId,
                type: 'line',
                source: sourceId,
                filter: ['==', ['get', 'renderStyle'], 'AOI'],
                paint: { 'line-color': '#008080', 'line-width': 3 }
            })

            this.focusedLayer = { aoiLayerId, fowLayerId, sourceId }
            return extent
        } catch (error) {
            console.error('Error highlighting AOI:', error)
            return null
        }
    }

    cutFromGlobalPolygon(scissor: OLMultiPolygon | OLPolygon): GeoJSONFeature<MultiPolygon> {
        // Create a global polygon covering the entire world in EPSG:4326
        const globalCoords: Position[] = [
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
            [-180, -90]
        ]

        // Get the scissor coordinates and convert from EPSG:3857 to EPSG:4326
        const scissorPolygons =
            'getPolygons' in scissor ? (scissor as OLMultiPolygon).getPolygons() : [scissor as OLPolygon]

        // Collect all holes (each polygon becomes a hole in the global polygon)
        const holes: Position[][] = scissorPolygons.map(polygon =>
            polygon
                .getLinearRing(0)!
                .getCoordinates()
                .map((coord: Coordinate) => MapConvertMeasureUtils.mercatorToWgs84(coord[0], coord[1]))
        )

        // Create a single polygon with the global boundary as outer ring and all AOI polygons as holes
        const coordinates: Position[][][] = [[globalCoords, ...holes]]

        // Create the FoW feature as a MultiPolygon
        return {
            type: 'Feature',
            geometry: {
                type: 'MultiPolygon',
                coordinates
            },
            properties: {
                name: 'FogOfWar',
                renderStyle: 'FoW'
            }
        } as GeoJSONFeature<MultiPolygon>
    }

    addGeoJsonLayer(data: FeatureCollection, artifactName: string): VectorLayerGroup | undefined {
        if (!this.map) return undefined

        const layerId = `geojson-${artifactName}-${Date.now()}`
        const sourceId = `source-${layerId}`
        const layerIds: string[] = []

        this.map.addSource(sourceId, { type: 'geojson', data })

        const features = data.features || []
        const geomTypes = new Set(features.map((f: GeoJSONFeature) => f.geometry?.type))

        const layerConfigs = [
            {
                check: geomTypes.has('Polygon') || geomTypes.has('MultiPolygon'),
                layers: [
                    {
                        id: `${layerId}-fill`,
                        type: 'fill' as const,
                        filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
                        paint: { 'fill-color': ['coalesce', ['get', 'color'], '#3388ff'], 'fill-opacity': 0.5 }
                    },
                    {
                        id: `${layerId}-outline`,
                        type: 'line' as const,
                        filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
                        paint: { 'line-color': ['coalesce', ['get', 'color'], '#3388ff'], 'line-width': 2 }
                    }
                ]
            },
            {
                check: geomTypes.has('LineString') || geomTypes.has('MultiLineString'),
                layers: [
                    {
                        id: `${layerId}-line`,
                        type: 'line' as const,
                        filter: ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]],
                        paint: {
                            'line-color': ['coalesce', ['get', 'color'], '#3388ff'],
                            'line-width': 3,
                            'line-opacity': 0.8
                        },
                        layout: { 'line-cap': 'round', 'line-join': 'round' }
                    }
                ]
            },
            {
                check: geomTypes.has('Point') || geomTypes.has('MultiPoint'),
                layers: [
                    {
                        id: `${layerId}-point`,
                        type: 'circle' as const,
                        filter: ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]],
                        paint: {
                            'circle-radius': 5,
                            'circle-color': ['coalesce', ['get', 'color'], '#3388ff'],
                            'circle-stroke-color': '#000000',
                            'circle-stroke-width': 1,
                            'circle-opacity': 0.8
                        }
                    }
                ]
            }
        ]

        layerConfigs.forEach(config => {
            if (config.check) {
                config.layers.forEach(layer => {
                    this.map!.addLayer({ source: sourceId, ...layer } as maplibregl.LayerSpecification)
                    layerIds.push(layer.id)
                })
            }
        })

        this.geojsonLayer = { layerIds, sourceId, name: artifactName }
        MapGeoJsonUtils.setupGeoJsonInteractions(this.map, layerId, artifactName, this.featureHoverOverlay, overlay => {
            this.featureHoverOverlay = overlay
        })

        this.layerSwitcherControl?.updateLayerControls()

        return this.geojsonLayer
    }

    async addGeoTiffLayer(sourceURL: string, artifactName?: string) {
        if (!this.map) return undefined

        const layerId = `geotiff-${artifactName || 'layer'}-${Date.now()}`
        const sourceId = `source-${layerId}`

        try {
            const tiff = await geoTiffFromUrl(sourceURL)
            const image = await tiff.getImage()
            const bbox = image.getBoundingBox()
            const { rasters, width, height } = await MapGeoTiffUtils.readDownsampledGeoTiffRasters(tiff)
            const canvas = MapGeoTiffUtils.renderPalettedGeoTiff(
                width,
                height,
                MapGeoTiffUtils.getFirstRaster(rasters),
                image.getFileDirectory().ColorMap
            )

            this.map.addSource(sourceId, {
                type: 'image',
                url: canvas.toDataURL(),
                coordinates: [
                    [bbox[0], bbox[3]],
                    [bbox[2], bbox[3]],
                    [bbox[2], bbox[1]],
                    [bbox[0], bbox[1]]
                ]
            })

            this.map.addLayer({
                id: layerId,
                source: sourceId,
                type: 'raster',
                paint: { 'raster-opacity': 0.8, 'raster-resampling': 'linear' }
            })

            this.layerSwitcherControl?.updateLayerControls()

            return {
                id: layerId,
                sourceId,
                name: artifactName || 'GeoTIFF Layer',
                setOpacity: (opacity: number) => this.map?.setPaintProperty(layerId, 'raster-opacity', opacity),
                setVisible: (visible: boolean) =>
                    this.map?.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
            }
        } catch (error) {
            console.error('Error loading GeoTIFF:', error)
            if (this.map?.getLayer(layerId)) {
                this.map.removeLayer(layerId)
            }
            if (this.map?.getSource(sourceId)) {
                this.map.removeSource(sourceId)
            }
            throw error
        }
    }

    removeComputeLayers(): void {
        if (this.regionLayer && this.map) {
            this.map.setLayoutProperty('region-boundaries-fill', 'visibility', 'none')
            this.map.setLayoutProperty('region-boundaries-outline', 'visibility', 'none')
            this.regionLayer.visible = false
        }

        if (this.selectedRegionLayer && this.map) {
            this.selectedRegionLayer.layerIds.forEach(layerId =>
                this.map!.setLayoutProperty(layerId, 'visibility', 'none')
            )

            if (this.selectedOlFeatures.getLength() > 0) {
                this.selectedOlFeatures.clear()
                this.selectedGeoJSONFeatures = []
                const source = this.map.getSource(this.selectedRegionLayer.sourceId) as GeoJSONSource
                source?.setData({ type: 'FeatureCollection', features: [] })
            }
        }

        this.stopDrawing()
        this.clearDrawnFeatures()
    }

    removeFocusedLayer(): void {
        if (!this.focusedLayer || !this.map) return
        ;[this.focusedLayer.aoiLayerId, this.focusedLayer.fowLayerId].forEach(id => {
            if (this.map!.getLayer(id)) this.map!.removeLayer(id)
        })

        if (this.map.getSource(this.focusedLayer.sourceId)) {
            this.map.removeSource(this.focusedLayer.sourceId)
        }
        this.focusedLayer = undefined
    }

    enableComputeLayers() {
        if (this.regionLayer && this.map) {
            this.map.setLayoutProperty('region-boundaries-fill', 'visibility', 'visible')
            this.map.setLayoutProperty('region-boundaries-outline', 'visibility', 'visible')
            this.regionLayer.visible = true
        }

        if (this.selectedRegionLayer && this.map) {
            this.selectedRegionLayer.layerIds.forEach(layerId =>
                this.map!.setLayoutProperty(layerId, 'visibility', 'visible')
            )
        }

        if (this.mapDrawingService?.currentDrawModeValue) {
            this.terraDrawControl?.getTerraDrawInstance()?.setMode(this.mapDrawingService.currentDrawModeValue)
        }
    }

    selectRegions(pixel: [number, number]) {
        if (!this.regionLayer?.visible || !this.map) return

        const vectorFeatures = this.map.queryRenderedFeatures([pixel[0], pixel[1]], {
            layers: ['region-boundaries-fill']
        })

        if (!vectorFeatures.length) return

        const clickedFeature = vectorFeatures[0]
        const featureId = clickedFeature.properties?.['id']

        if (!featureId) {
            console.error('No feature ID found in vector tile')
            return
        }

        const ogcApiUrl = `https://maps.heigit.org/vector/service/ohsome/ogc/features/v1/collections/admin_world_water/items/${featureId}`

        this.http.get<GeoJSONFeature>(ogcApiUrl, { headers: { Accept: 'application/geo+json' } }).subscribe({
            next: feature => {
                if (!feature?.geometry) return

                this.selectedOlFeatures.clear()
                this.selectedGeoJSONFeatures = []

                const processedFeature: GeoJSONFeature = {
                    type: 'Feature',
                    geometry: feature.geometry,
                    properties: {
                        name: resolveLocalizedName(feature.properties, this.translocoService.getActiveLang()),
                        id: (feature.properties?.['id'] || featureId).toString(),
                        area: 0
                    }
                }

                // Calculate area after feature is created
                if (feature.geometry) {
                    processedFeature.properties!['area'] = Number(
                        (area(processedFeature) * MapService.sqmToSqkmFactor).toFixed(2)
                    )
                }

                // Add OpenLayers compatibility wrapper
                this.selectedOlFeatures.push({
                    get: (key: string) => processedFeature.properties![key],
                    set: (key: string, value: string | number | boolean | null | undefined) => {
                        processedFeature.properties![key] = value
                    },
                    getGeometry: () => processedFeature.geometry,
                    getProperties: () => processedFeature.properties
                } as unknown as Feature)

                this.selectedGeoJSONFeatures = [processedFeature]

                if (this.selectedRegionLayer) {
                    const source = this.map?.getSource(this.selectedRegionLayer.sourceId) as GeoJSONSource
                    source?.setData({ type: 'FeatureCollection', features: [processedFeature] })
                }
            },
            error: error => console.error('Error fetching feature from OGC API:', error)
        })
    }

    getSelectedRegion(): GeoJSONFeature | null {
        return this.selectedGeoJSONFeatures.length > 0 ? this.selectedGeoJSONFeatures[0] : null
    }

    removeSelectedRegion(feature: Feature): void {
        this.selectedOlFeatures.remove(feature)

        const featureId = feature.get('id')
        if (featureId) {
            this.selectedGeoJSONFeatures = this.selectedGeoJSONFeatures.filter(
                geoJsonFeature => geoJsonFeature.properties?.['id'] !== featureId
            )
        }

        if (this.selectedRegionLayer && this.map) {
            const source = this.map.getSource(this.selectedRegionLayer.sourceId) as GeoJSONSource
            source?.setData({ type: 'FeatureCollection', features: this.selectedGeoJSONFeatures })
        }
    }

    startDrawing(type: 'Polygon' | 'Circle' | 'Box'): void {
        if (this.mapDrawingService?.startDrawing) {
            this.mapDrawingService.startDrawing(type, this.map)
        }
    }

    stopDrawing(): void {
        if (this.mapDrawingService?.stopDrawing) {
            this.mapDrawingService.stopDrawing()
        }
    }

    clearDrawnFeatures(): void {
        if (this.mapDrawingService?.clearDrawnFeatures) {
            this.mapDrawingService.clearDrawnFeatures()
        }

        this.selectedOlFeatures.clear()
        this.selectedGeoJSONFeatures = []

        if (this.selectedRegionLayer && this.map) {
            const source = this.map.getSource(this.selectedRegionLayer.sourceId) as GeoJSONSource
            if (source) {
                source.setData({
                    type: 'FeatureCollection',
                    features: []
                })
            }
        }
    }

    enableBoundarySelection(): void {
        if (this.regionLayer && this.map) {
            this.map.setLayoutProperty('region-boundaries-fill', 'visibility', 'visible')
            this.map.setLayoutProperty('region-boundaries-outline', 'visibility', 'visible')
            this.regionLayer.visible = true
        }
    }

    disableBoundarySelection(): void {
        if (this.regionLayer && this.map) {
            this.map.setLayoutProperty('region-boundaries-fill', 'visibility', 'none')
            this.map.setLayoutProperty('region-boundaries-outline', 'visibility', 'none')
            this.regionLayer.visible = false
        }
    }

    private createRasterStyle(): StyleSpecification {
        return {
            version: 8,
            sources: {
                'raster-tiles': {
                    type: 'raster',
                    tiles: [
                        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                    ],
                    tileSize: 256,
                    attribution:
                        'Powered by <a href="https://www.esri.com/" target="_blank">ESRI</a> | Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
                    maxzoom: 19
                }
            },
            layers: [
                {
                    id: 'simple-tiles',
                    type: 'raster',
                    source: 'raster-tiles',
                    minzoom: 0,
                    maxzoom: 19
                }
            ]
        }
    }

    private getStyleFor(style: BasemapStyleName): string | StyleSpecification {
        switch (style) {
            case BasemapStyleName.Colorful:
                return 'assets/map-schema/colorful/style.json'
            case BasemapStyleName.Graybeard:
                return 'assets/map-schema/graybeard/style.json'
            case BasemapStyleName.EsriWorldImagery:
                return this.createRasterStyle()
        }
    }

    private getMapStyles(): MapStyle[] {
        return ALL_BASEMAPS.map(title => ({ title, uri: this.getStyleFor(title) }))
    }

    private addLayerSwitcher(): void {
        if (!this.map) return

        const styles: MapStyle[] = this.getMapStyles()

        const initialExpanded = !this.storageService.getLayerSwitcherCollapsed()

        this.layerSwitcherControl = MapControlsUtils.createLayerSwitcherControl(
            styles,
            this.currentBasemapStyle,
            this.translocoService,
            (styleName: string) => {
                if (this.mapDrawingService?.clearTerraDrawAfterStyleChange) {
                    this.mapDrawingService.clearTerraDrawAfterStyleChange()
                }

                if (isBasemapStyleName(styleName)) {
                    this.currentBasemapStyle = styleName
                    this.styleChangeSubject.next(styleName)
                    this.storageService.saveSelectedMapLayer(styleName)
                }
            },
            (isExpanded: boolean) => {
                this.storageService.saveLayerSwitcherCollapsed(!isExpanded)
            },
            initialExpanded
        )

        this.map.addControl(this.layerSwitcherControl as IControl, 'bottom-right')
    }

    private async zoomToUserLocale(): Promise<void> {
        if (!this.map) return

        this.map.flyTo({
            center: MapService.HEIDELBERG_COORDS,
            zoom: 4.5,
            duration: 2000,
            essential: true
        })
    }

    private async fitToUserLocale(): Promise<void> {
        if (!this.map) return

        this.map.jumpTo({
            center: MapService.HEIDELBERG_COORDS,
            zoom: 4.5
        })
    }

    private resetToGlobalView(): void {
        if (!this.map) return

        MapGlobeUtils.resetToGlobalView(this.map)
    }

    private handleRouteChange(url: string): void {
        const isReportMap = this.mapId?.startsWith('report-map-')

        const wasOnLanding = this.isOnLanding
        this.isOnLanding = !isReportMap && url === '/dashboard'

        if (!this.map) return

        if (wasOnLanding && !this.isOnLanding) {
            // Dashboard → Plugin: zoom to locale with user's preferred style
            MapGlobeUtils.stopSpinning()
            this.zoomToUserLocale().catch(error => console.warn('Failed to zoom to user locale:', error))
        } else if (!wasOnLanding && this.isOnLanding) {
            // Plugin → Dashboard: reset to global view and start spinning
            this.resetToGlobalView()
            setTimeout(() => {
                if (this.isOnLanding) {
                    MapGlobeUtils.startSpinning(this.map!, this.isOnLanding)
                }
            }, 2050)
        }
    }
}
