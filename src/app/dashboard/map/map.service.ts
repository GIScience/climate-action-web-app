import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { NavigationEnd, Router } from '@angular/router'
import { MapGeoTiffUtils } from '@app/dashboard/map/utils/map-geotiff.utils'
import { DrawInput } from '@app/dashboard/plugin/plugin.interface'
import { StorageService } from '@app/storage.service'
import { resolveLocalizedName } from '@app/utils/localized-name.utils'
import { TranslocoService } from '@jsverse/transloco'
import bbox from '@turf/bbox'
import { colorful, graybeard } from '@versatiles/style'
import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw'
import type {
    BBox,
    FeatureCollection,
    Feature as GeoJSONFeature,
    Point as GeoJSONPoint,
    Geometry,
    MultiPolygon
} from 'geojson'
import maplibregl, {
    GeoJSONSource,
    IControl,
    LngLatBounds,
    LngLatLike,
    Map as MaplibreMap,
    Marker,
    Popup,
    StyleSpecification
} from 'maplibre-gl'
import { updateMaplibreLocale } from 'maplibre-ui-translations'
import { BehaviorSubject, Observable } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import { environment } from 'src/environments/environment'
import { PluginService } from '../plugin/plugin.service'
import { MapArtifactLayer, MapArtifactManagerService } from './map-artifact-manager.service'
import { MapDrawingService } from './map-drawing.service'
import { MapFoWManagerService } from './map-fow-manager.service'
import { RegionChoiceDialogComponent, RegionChoiceOption } from './region-choice-dialog/region-choice-dialog.component'
import { MapControlsUtils } from './utils/map-controls.utils'
import { MapGeoJsonUtils } from './utils/map-geojson.utils'
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

export type Extent = [number, number, number, number]

interface VectorLayerGroup {
    layerIds: string[]
    sourceId: string
    name: string
    visible?: boolean
    baseLayerId?: string
}

interface RasterLayer {
    layerId: string
    sourceId: string
    visible?: boolean
}

// Shared paint/layout styles for vector layers (GeoJSON and PMTiles)
const VECTOR_LAYER_STYLES = {
    fill: {
        paint: {
            'fill-color': ['coalesce', ['get', 'color'], '#3388ff'] as maplibregl.ExpressionSpecification,
            'fill-opacity': 0.8
        }
    },
    outline: {
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#3388ff'] as maplibregl.ExpressionSpecification,
            'line-width': 2
        }
    },
    line: {
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#3388ff'] as maplibregl.ExpressionSpecification,
            'line-width': 3,
            'line-opacity': 0.8
        },
        layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const }
    },
    point: {
        paint: {
            'circle-radius': 5,
            'circle-color': ['coalesce', ['get', 'color'], '#3388ff'] as maplibregl.ExpressionSpecification,
            'circle-stroke-color': '#000000',
            'circle-stroke-width': 1,
            'circle-opacity': 0.8
        }
    }
}

@Injectable({
    providedIn: 'root'
})
export class MapService {
    private pluginService = inject(PluginService)
    private http = inject(HttpClient)
    storageService = inject(StorageService)
    private translocoService = inject(TranslocoService)
    private fowManager = inject(MapFoWManagerService)
    private router = inject(Router, { optional: true })
    private mapDrawingService = inject(MapDrawingService, { optional: true })
    private mapArtifactManager = inject(MapArtifactManagerService, { optional: true })
    private dialog = inject(MatDialog, { optional: true })

    // Core Map Instance
    map: MaplibreMap | undefined
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
    selectedFeatures: GeoJSONFeature[] = []
    selectedFeatures$ = new BehaviorSubject<GeoJSONFeature[]>([])

    // Layer Management
    private layersInitialized = false
    regionLayer: RasterLayer | undefined
    selectedRegionLayer: VectorLayerGroup | undefined
    vectorLayer: VectorLayerGroup | undefined

    // Drawing & Measurement Tools
    terraDrawControl: MaplibreTerradrawControl | undefined

    private readonly geocodeAPIKey = environment.geocodeAPIKey
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
                this.selectedFeatures = drawnFeatures.map(({ geoJsonFeature }) => geoJsonFeature)
                this.selectedFeatures$.next(this.selectedFeatures)

                if (this.selectedRegionLayer && this.map) {
                    const source = this.map.getSource(this.selectedRegionLayer.sourceId) as GeoJSONSource
                    source?.setData({ type: 'FeatureCollection', features: this.selectedFeatures })
                }
            })
        }

        this.translocoService.langChanges$.subscribe(lang => {
            if (this.map) {
                updateMaplibreLocale(this.map, lang)
            }
        })

        this.mapArtifactManager?.activeMapArtifacts$?.subscribe(() => {
            this.layerSwitcherControl?.updateLayerControls()
        })
    }

    initMap(targetId: string, isReportMap: boolean = false) {
        this.mapId = targetId

        const storedStyle = this.storageService.getSelectedMapLayer('')
        this.currentBasemapStyle = isBasemapStyleName(storedStyle) ? storedStyle : BasemapStyleName.Colorful
        this.styleChangeSubject.next(this.currentBasemapStyle)

        this.map = new MaplibreMap({
            container: targetId,
            style: this.getStyleFor(this.currentBasemapStyle),
            zoom: 3,
            minZoom: 2,
            maxZoom: 20,
            renderWorldCopies: false,
            maxPitch: 85
        })

        updateMaplibreLocale(this.map, this.translocoService.getActiveLang())

        // Initialize FoW manager with the map
        this.fowManager.setMap(this.map, !isReportMap)

        if (!isReportMap && this.mapArtifactManager) {
            this.mapArtifactManager.setMapInstance(this.map, this)
        }

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

            if (this.layersInitialized) return

            this.setupLayers()

            if (this.isOnLanding) {
                MapGlobeUtils.startSpinning(this.map!, this.isOnLanding)
            } else if (!isReportMap) {
                this.fitToUserLocale().catch(error => console.warn('Failed to fit to user locale on init:', error))
            }
        })

        if (environment.environmentType === 'testing' || environment.environmentType === 'development') {
            ;(window as Window & { map?: MaplibreMap }).map = this.map
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

        this.layersInitialized = true
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
            } else if (this.vectorLayer) {
                const existingLayers = this.vectorLayer.layerIds.filter((id: string) => this.map!.getLayer(id))
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
        const orsUrl = `${environment.geocodeUrl}/autocomplete?api_key=${this.geocodeAPIKey}&text=${query}&layers=address,venue,neighbourhood,locality,borough,localadmin,county,macrocounty`

        return this.http.get<FeatureCollection>(orsUrl).pipe(
            map(collection => {
                return collection.features
                    .filter(
                        (feature: GeoJSONFeature): feature is AutocompleteFeature => feature.geometry!.type === 'Point'
                    )
                    .map((feature: GeoJSONFeature): AutocompleteFeature => ({
                        ...feature,
                        geometry: feature.geometry as GeoJSONPoint,
                        // Ensure required properties exist with fallbacks
                        properties: {
                            ...feature.properties,
                            name: feature.properties?.['name'] || 'Unknown location',
                            label: feature.properties?.['label'] || feature.properties?.['name'] || 'Unknown location'
                        },
                        bbox: feature.bbox
                    }))
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

        // Create bounds from extent [minLng, minLat, maxLng, maxLat]
        const bounds = new LngLatBounds(
            [extent[0], extent[1]], // southwest
            [extent[2], extent[3]] // northeast
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
        // Handle extent array [minX, minY, maxX, maxY] in WGS84
        else if (Array.isArray(target) && target.length === 4) {
            bounds = new LngLatBounds([target[0], target[1]], [target[2], target[3]])
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

    highlightAoI(feature: GeoJSONFeature): Extent | null {
        if (!feature?.geometry || !this.map) return null

        const extent = bbox(feature) as Extent
        if (!extent?.length) return null

        this.fowManager.clearByType(this.map, 'focused')
        this.fowManager.addGeometry(this.map, 'focused-computation', feature, 'focused')

        return extent
    }

    async addPmtilesLayer(url: string, artifactName: string): Promise<VectorLayerGroup | undefined> {
        if (!this.map) return undefined

        const layerId = `pmtiles-${artifactName}-${Date.now()}`
        const sourceId = `source-${layerId}`

        // Register PMTiles protocol with MapLibre
        const { PMTiles, Protocol } = await import('pmtiles')
        const protocol = new Protocol()
        maplibregl.addProtocol('pmtiles', protocol.tile)

        const pmtiles = new PMTiles(url)
        protocol.add(pmtiles)

        // Get source-layer name from PMTiles metadata
        const metadata = (await pmtiles.getMetadata()) as { vector_layers?: { id: string }[] }
        const sourceLayer = metadata.vector_layers?.[0]?.id ?? artifactName

        this.map.addSource(sourceId, {
            type: 'vector',
            url: `pmtiles://${url}`
        })

        return this.configureVectorLayers(layerId, sourceId, artifactName, { sourceLayer })
    }

    addGeoJsonLayer(data: FeatureCollection, artifactName: string): VectorLayerGroup | undefined {
        if (!this.map) return undefined

        const layerId = `geojson-${artifactName}-${Date.now()}`
        const sourceId = `source-${layerId}`

        this.map.addSource(sourceId, { type: 'geojson', data: data })

        return this.configureVectorLayers(layerId, sourceId, artifactName)
    }

    configureVectorLayers(
        layerId: string,
        sourceId: string,
        artifactName: string,
        options?: { sourceLayer?: string }
    ): VectorLayerGroup | undefined {
        if (!this.map) return undefined

        const layerIds: string[] = []

        // Filters that include Multi* geometry types for GeoJSON
        const polygonFilter: maplibregl.FilterSpecification = [
            'in',
            ['geometry-type'],
            ['literal', ['Polygon', 'MultiPolygon']]
        ]
        const lineFilter: maplibregl.FilterSpecification = [
            'in',
            ['geometry-type'],
            ['literal', ['LineString', 'MultiLineString']]
        ]
        const pointFilter: maplibregl.FilterSpecification = [
            'in',
            ['geometry-type'],
            ['literal', ['Point', 'MultiPoint']]
        ]

        const layerConfigs = [
            {
                id: `${layerId}-fill`,
                type: 'fill' as const,
                filter: polygonFilter,
                ...VECTOR_LAYER_STYLES.fill
            },
            {
                id: `${layerId}-outline`,
                type: 'line' as const,
                filter: polygonFilter,
                ...VECTOR_LAYER_STYLES.outline
            },

            {
                id: `${layerId}-line`,
                type: 'line' as const,
                filter: lineFilter,
                ...VECTOR_LAYER_STYLES.line
            },

            {
                id: `${layerId}-point`,
                type: 'circle' as const,
                filter: pointFilter,
                ...VECTOR_LAYER_STYLES.point
            }
        ]

        layerConfigs.forEach(config => {
            const layerSpec: maplibregl.LayerSpecification = {
                source: sourceId,
                ...(options?.sourceLayer && { 'source-layer': options.sourceLayer }),
                ...config
            } as maplibregl.LayerSpecification
            this.map!.addLayer(layerSpec)
            layerIds.push(config.id)
        })

        const layerGroup: VectorLayerGroup = { layerIds, sourceId, name: artifactName, baseLayerId: layerId }
        this.vectorLayer = layerGroup

        MapGeoJsonUtils.setupGeoJsonInteractions(
            this.map,
            layerId,
            artifactName,
            this.featureHoverOverlay,
            (overlay: Popup | undefined) => {
                this.featureHoverOverlay = overlay
            },
            this.mapArtifactManager
                ? () => {
                      const layers = this.mapArtifactManager!.getActiveMapArtifacts()
                      const matchingLayer = layers.find(l => l.layerIds?.some(id => id.startsWith(layerId)))
                      return matchingLayer ? this.mapArtifactManager!.getDisplayName(matchingLayer) : artifactName
                  }
                : undefined
        )

        this.layerSwitcherControl?.updateLayerControls()

        return layerGroup
    }

    async addLegacyGeoTiffLayer(sourceURL: string, artifactName?: string) {
        if (!this.map) return undefined

        const layerId = `geotiff-${artifactName || 'layer'}-${Date.now()}`
        const sourceId = `source-${layerId}`

        try {
            const { fromUrl: geoTiffFromUrl } = await import('geotiff')
            const tiff = await geoTiffFromUrl(sourceURL)
            const image = await tiff.getImage()
            const bbox = image.getBoundingBox()
            const rawNoData = image.getGDALNoData()
            const nodataValue = Number.isFinite(Number(rawNoData)) ? Number(rawNoData) : 0
            const [{ rasters, width, height }, colorMap] = await Promise.all([
                MapGeoTiffUtils.readDownsampledGeoTiffRasters(tiff),
                image.getFileDirectory().loadValue('ColorMap')
            ])
            const canvas = MapGeoTiffUtils.renderPalettedGeoTiff(
                width,
                height,
                MapGeoTiffUtils.getFirstRaster(rasters),
                colorMap,
                nodataValue
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
                paint: { 'raster-opacity': 0.8, 'raster-resampling': 'nearest' }
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

    async addGeoTiffLayer(sourceURL: string, artifactName?: string) {
        if (!this.map) return undefined

        const { cogProtocol } = await import('@geomatico/maplibre-cog-protocol')
        maplibregl.addProtocol('cog', cogProtocol)

        const layerId = `geotiff-${artifactName || 'layer'}-${Date.now()}`
        const sourceId = `source-${layerId}`

        this.map.addSource(sourceId, {
            type: 'raster',
            url: `cog://${sourceURL}`,
            tileSize: 256
        })

        this.map.addLayer({
            id: layerId,
            source: sourceId,
            type: 'raster',
            paint: { 'raster-opacity': 0.8, 'raster-resampling': 'nearest' }
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
    }

    async addRasterLayer(sourceURL: string, artifactName?: string) {
        const isWebMercator = await MapGeoTiffUtils.isWebMercator(sourceURL)

        if (isWebMercator) {
            return this.addGeoTiffLayer(sourceURL, artifactName)
        } else {
            return this.addLegacyGeoTiffLayer(sourceURL, artifactName)
        }
    }

    private removeManagedMapLayer(layer: MapArtifactLayer): void {
        if (!this.mapArtifactManager) return

        if (layer.layerIds && layer.sourceId) {
            if (layer.artifact.modality === 'VECTOR_MAP_LAYER') {
                this.removeVectorLayer({
                    layerIds: layer.layerIds,
                    sourceId: layer.sourceId,
                    name: layer.artifact.name
                })
            } else if (layer.artifact.modality === 'RASTER_MAP_LAYER' && layer.layerIds.length > 0) {
                this.removeGeoTiffLayer(layer.layerIds[0], layer.sourceId)
            }
        }

        this.mapArtifactManager.removeMapArtifact(layer.artifact)
        this.layerSwitcherControl?.updateLayerControls()
    }

    removeVectorLayer(layerGroup: VectorLayerGroup): void {
        if (!this.map || !layerGroup) return

        const baseLayerId = this.getBaseLayerId(layerGroup)

        layerGroup.layerIds.forEach(id => {
            if (this.map!.getLayer(id)) {
                this.map!.removeLayer(id)
            }
        })

        if (this.map.getSource(layerGroup.sourceId)) {
            this.map.removeSource(layerGroup.sourceId)
        }

        if (this.vectorLayer?.sourceId === layerGroup.sourceId) {
            this.vectorLayer = undefined
        }

        if (baseLayerId) {
            MapGeoJsonUtils.cleanupGeoJsonInteractions(this.map, baseLayerId)
        }

        this.layerSwitcherControl?.updateLayerControls()
    }

    private getBaseLayerId(layerGroup: VectorLayerGroup): string | undefined {
        if (layerGroup.baseLayerId) return layerGroup.baseLayerId
        const firstLayerId = layerGroup.layerIds[0]
        if (!firstLayerId) return undefined
        return firstLayerId.replace(/-(fill|outline|line|point)$/, '')
    }

    removeGeoTiffLayer(layerId: string, sourceId: string): void {
        if (!this.map) return

        if (this.map.getLayer(layerId)) {
            this.map.removeLayer(layerId)
        }

        if (this.map.getSource(sourceId)) {
            this.map.removeSource(sourceId)
        }
        this.layerSwitcherControl?.updateLayerControls()
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

            if (this.selectedFeatures.length > 0) {
                this.selectedFeatures = []
                this.selectedFeatures$.next(this.selectedFeatures)
                const source = this.map.getSource(this.selectedRegionLayer.sourceId) as GeoJSONSource
                source?.setData({ type: 'FeatureCollection', features: [] })
            }
        }

        this.stopDrawing()
        this.clearDrawnFeatures()
    }

    removeFocusedLayer(): void {
        if (!this.map) return
        this.fowManager.clearByType(this.map, 'focused')
    }

    updateFoWGeometries(geometries: GeoJSONFeature[], type: 'pinned'): void {
        if (!this.map) return
        this.fowManager.clearByType(this.map, type)
        geometries.forEach((geom, index) => {
            this.fowManager.addGeometry(this.map!, `${type}-${index}`, geom, type)
        })
    }

    clearFoWByType(type: 'pinned'): void {
        if (!this.map) return
        this.fowManager.clearByType(this.map, type)
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

    async renderFeature(feature: GeoJSONFeature, featureIdFallback: string) {
        if (!feature?.geometry) return

        const processedFeature: GeoJSONFeature = {
            type: 'Feature',
            geometry: feature.geometry,
            properties: {
                name: resolveLocalizedName(feature.properties, this.translocoService.getActiveLang()),
                id: (feature.properties?.['id'] || feature.id || featureIdFallback).toString(),
                area: 0
            }
        }

        // Calculate area after feature is created
        if (feature.geometry) {
            const { default: area } = await import('@turf/area')
            processedFeature.properties!['area'] = Number(
                (area(processedFeature) * MapService.sqmToSqkmFactor).toFixed(2)
            )
        }

        this.selectedFeatures = [processedFeature]
        this.selectedFeatures$.next(this.selectedFeatures)

        if (this.selectedRegionLayer) {
            const source = this.map?.getSource(this.selectedRegionLayer.sourceId) as GeoJSONSource
            source?.setData({ type: 'FeatureCollection', features: [processedFeature] })
        }
    }

    selectRegions(pixel: [number, number]) {
        if (!this.regionLayer?.visible || !this.map) return

        const vectorFeatures = this.map.queryRenderedFeatures([pixel[0], pixel[1]], {
            layers: ['region-boundaries-fill']
        })

        if (!vectorFeatures.length) return

        // De-duplicate by feature id, since vector tiles can return same feature multiple times.
        const uniqueFeatures = new Map<string, GeoJSONFeature>()
        for (const feature of vectorFeatures) {
            const id = feature.properties?.['id']
            if (id && !uniqueFeatures.has(id.toString())) {
                uniqueFeatures.set(id.toString(), feature)
            }
        }

        const distinctFeatures = [...uniqueFeatures.values()]

        if (!distinctFeatures.length) {
            console.error('No feature ID found in vector tile')
            return
        }

        if (distinctFeatures.length === 1 || !this.dialog) {
            this.applyRegionSelection(distinctFeatures[0].properties!['id'].toString())
            return
        }

        const options: RegionChoiceOption[] = distinctFeatures
            .map(feature => ({
                id: feature.properties!['id'].toString(),
                name: resolveLocalizedName(feature.properties, this.translocoService.getActiveLang()),
                adminLevel: Number(feature.properties?.['admin_level'])
            }))
            .sort((a, b) => a.adminLevel - b.adminLevel)

        this.dialog
            .open(RegionChoiceDialogComponent, {
                width: '450px',
                autoFocus: false,
                data: { options }
            })
            .afterClosed()
            .subscribe((choice?: RegionChoiceOption) => {
                if (choice) {
                    this.applyRegionSelection(choice.id)
                }
            })
    }

    private applyRegionSelection(featureId: string): void {
        const ogcApiUrl = `${environment.heigitMapsUrl}/vector/service/ohsome/ogc/features/v1/collections/admin_world_water/items/${featureId}`

        this.http.get<GeoJSONFeature>(ogcApiUrl, { headers: { Accept: 'application/geo+json' } }).subscribe({
            next: async feature => this.renderFeature(feature, featureId),
            error: error => console.error('Error fetching feature from OGC API:', error)
        })
    }
    sanitizeGeom(geom: Geometry): MultiPolygon {
        switch (geom.type) {
            case 'MultiPolygon':
                return geom
            case 'Polygon':
                return { type: 'MultiPolygon', coordinates: [geom.coordinates] }
            default:
                throw new Error(`Expected polygonal geometry, got ${geom.type}`)
        }
    }

    getSelectedRegion(): GeoJSONFeature | null {
        if (this.selectedFeatures.length === 0) return null

        const feature = this.selectedFeatures[0]
        try {
            feature.geometry = this.sanitizeGeom(feature.geometry)
        } catch (error) {
            console.error(error)
            return null
        }
        return feature
    }

    removeSelectedRegion(feature: GeoJSONFeature): void {
        this.selectedFeatures = this.selectedFeatures.filter(f => f !== feature)
        this.selectedFeatures$.next(this.selectedFeatures)

        if (this.selectedRegionLayer && this.map) {
            const source = this.map.getSource(this.selectedRegionLayer.sourceId) as GeoJSONSource
            source?.setData({ type: 'FeatureCollection', features: this.selectedFeatures })
        }
    }

    startDrawing(type: DrawInput): void {
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

        this.selectedFeatures = []
        this.selectedFeatures$.next(this.selectedFeatures)

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

    filterVectorLayerByCategories(layerIds: string[], hiddenCategories: string[] | null): void {
        if (!this.map) return

        // Re-apply each layer's original geometry-type filter alongside the category filter, since setFilter replaces the entire filter.
        const originalGeometryFilters: Record<string, maplibregl.ExpressionSpecification> = {
            '-fill': ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
            '-outline': ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
            '-line': ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]],
            '-point': ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]]
        }

        const categoryExclusionFilter: maplibregl.ExpressionSpecification | null =
            hiddenCategories !== null
                ? ['!', ['in', ['downcase', ['get', 'label']], ['literal', hiddenCategories.map(c => c.toLowerCase())]]]
                : null

        for (const layerId of layerIds) {
            if (!this.map.getLayer(layerId)) continue

            const suffix = Object.keys(originalGeometryFilters).find(s => layerId.endsWith(s))
            if (!suffix) continue

            const baseFilter = originalGeometryFilters[suffix]
            const filter: maplibregl.ExpressionSpecification = categoryExclusionFilter
                ? ['all', baseFilter, categoryExclusionFilter]
                : baseFilter
            this.map.setFilter(layerId, filter)
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

    private getStyleFor(style: BasemapStyleName): StyleSpecification {
        const baseUrl = 'https://tiles.versatiles.org'
        switch (style) {
            case BasemapStyleName.Colorful:
                return colorful({ baseUrl }) as StyleSpecification
            case BasemapStyleName.Graybeard:
                return graybeard({ baseUrl }) as StyleSpecification
            case BasemapStyleName.EsriWorldImagery:
                return this.createRasterStyle()
        }
    }

    private getMapStyles(): MapStyle[] {
        return ALL_BASEMAPS.map(title => ({ title, style: this.getStyleFor(title) }))
    }

    private addLayerSwitcher(): void {
        if (!this.map) return

        const styles: MapStyle[] = this.getMapStyles()

        const initialExpanded = !this.storageService.getLayerSwitcherCollapsed()

        this.layerSwitcherControl = new MapStyleSwitcherControl(
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
            initialExpanded,
            this.mapArtifactManager ? () => this.mapArtifactManager!.getActiveMapArtifacts() : undefined,
            this.mapArtifactManager ? layer => this.removeManagedMapLayer(layer) : undefined,
            this.mapArtifactManager ? artifact => this.mapArtifactManager!.promoteToPin(artifact) : undefined,
            this.mapArtifactManager ? artifact => this.mapArtifactManager!.unpinArtifact(artifact) : undefined,
            this.mapArtifactManager ? artifact => this.mapArtifactManager!.isArtifactActive(artifact) : undefined
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
