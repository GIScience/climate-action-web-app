import { HttpClient } from '@angular/common/http'
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core'
import { StorageService } from '@app/storage.service'
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
import { Collection } from 'ol'
import { Coordinate } from 'ol/coordinate'
import { Extent } from 'ol/extent'
import Feature from 'ol/Feature'
import { Geometry, MultiPolygon as OLMultiPolygon, Polygon as OLPolygon } from 'ol/geom'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { environment } from 'src/environments/environment'
import { PluginService } from '../plugin/plugin.service'
import { MapDrawingService } from './map-drawing.service'
import { MapControlsUtils } from './utils/map-controls.utils'
import { MapConvertMeasureUtils } from './utils/map-convert-measure.utils'
import { MapGeoJsonUtils } from './utils/map-geojson.utils'
import { MapGeoTiffUtils } from './utils/map-geotiff.utils'
import { MapStyle, MapStyleSwitcherControl } from './utils/map-style-switcher.utils'

export const MAP_ID = new InjectionToken<string>('MAP_ID')

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
    // Core Map Instance
    map: Map | undefined
    mapId: string = 'main-map'

    // UI Controls & Overlays
    mapPopUp: Popup | undefined
    featureHoverOverlay: Popup | undefined
    layerSwitcherControl: MapStyleSwitcherControl | undefined
    layerSwitcherCollapsed: boolean = false
    currentBasemapStyle: string = 'Graybeard'

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

    constructor(
        private pluginService: PluginService,
        private http: HttpClient,
        public storageService: StorageService,
        @Optional() private mapDrawingService?: MapDrawingService,
        @Optional() @Inject(MAP_ID) mapId?: string
    ) {
        if (mapId) this.mapId = mapId

        this.pluginService.computeState$.subscribe(value => {
            if (value === 'compute-ready') {
                this.enableComputeLayers()
            } else if (value === 'inactive') {
                this.removeComputeLayers()
            }
        })

        this.mapDrawingService?.drawnFeatures$.subscribe(drawnFeatures => {
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

    initMap(targetId: string, isReportMap: boolean = false) {
        this.mapId = targetId

        const availableStyles = ['Graybeard', 'Colorful', 'ESRI World Imagery']
        const storedStyle = this.storageService.getSelectedMapLayer('')

        this.currentBasemapStyle = availableStyles.includes(storedStyle) ? storedStyle : 'Graybeard'

        this.map = new Map({
            container: targetId,
            style: this.getInitialMapStyle(),
            center: [8.6759928, 49.4187355],
            zoom: 3,
            maxZoom: 20,
            renderWorldCopies: false
        })

        const navigationControl = new maplibregl.NavigationControl({
            visualizePitch: true,
            visualizeRoll: true
        })
        navigationControl._container.className += ' navigation-controls'
        this.map!.addControl(new maplibregl.ScaleControl({ maxWidth: 200, unit: 'metric' }), 'top-right')
        this.map!.addControl(navigationControl, 'top-right')
        this.map!.addControl(MapControlsUtils.createZoomToZeroControl(), 'top-right')

        this.addLayerSwitcher()

        if (!isReportMap) {
            this.map!.scrollZoom.enable()
        } else {
            this.map!.scrollZoom.disable()
            this.setupReportMapZoomNote()
        }

        this.mapPopUp = new Popup({ closeButton: false, closeOnClick: false })
        this.setupEventHandlers()

        this.map!.on('load', () => {
            this.setupLayers()
            if (this.mapDrawingService) {
                this.terraDrawControl = this.mapDrawingService.initializeTerraDraw(this.map!)
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
                sourceId: 'region-wms-source',
                layerId: 'region-wms-layer',
                tiles: 'https://maps.heigit.org/ohsome/service/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=ohsome:admin_world_water&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&STYLES=&BBOX={bbox-epsg-3857}',
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

        // Region WMS Layer
        this.map.addSource(layers.regions.sourceId, {
            type: 'raster',
            tiles: [layers.regions.tiles],
            tileSize: 256,
            attribution: layers.regions.attribution
        })

        this.map.addLayer({
            id: layers.regions.layerId,
            type: 'raster',
            source: layers.regions.sourceId,
            paint: { 'raster-opacity': 1 },
            layout: { visibility: 'none' }
        })

        this.regionLayer = {
            layerId: layers.regions.layerId,
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
            if (!this.map) return
            let showPointer = false

            if (this.regionLayer?.visible) {
                showPointer = true
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
            this.map.setLayoutProperty(this.regionLayer.layerId, 'visibility', 'none')
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
            // Show the region WMS layer
            this.map.setLayoutProperty(this.regionLayer.layerId, 'visibility', 'visible')
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

        const canvas = this.map.getCanvas()
        const bbox = this.map.getBounds()
        const [sw, ne] = [bbox.getSouthWest(), bbox.getNorthEast()]
        const [swM, neM]: [Position, Position] = [
            MapConvertMeasureUtils.lngLatToMercator(sw.lng, sw.lat),
            MapConvertMeasureUtils.lngLatToMercator(ne.lng, ne.lat)
        ]

        const wmsParams = new URLSearchParams({
            SERVICE: 'WMS',
            VERSION: '1.1.1',
            REQUEST: 'GetFeatureInfo',
            FORMAT: 'image/png',
            TRANSPARENT: 'true',
            INFO_FORMAT: 'application/json',
            QUERY_LAYERS: 'ohsome:admin_world_water',
            LAYERS: 'ohsome:admin_world_water',
            FEATURE_COUNT: '10',
            STYLES: '',
            SRS: 'EPSG:3857',
            X: Math.round(pixel[0]).toString(),
            Y: Math.round(pixel[1]).toString(),
            WIDTH: canvas.clientWidth.toString(),
            HEIGHT: canvas.clientHeight.toString(),
            BBOX: `${swM[0]},${swM[1]},${neM[0]},${neM[1]}`
        })

        this.http.get(`https://maps.heigit.org/ohsome/service/wms?${wmsParams}`, { responseType: 'text' }).subscribe({
            next: responseText => {
                try {
                    const response = JSON.parse(responseText) as FeatureCollection
                    if (!response.features?.length) return

                    this.selectedOlFeatures.clear()
                    this.selectedGeoJSONFeatures = []
                    const features: GeoJSONFeature[] = response.features.map((feature: GeoJSONFeature) => {
                        // Transform geometry if needed (WMS returns EPSG:3857)
                        const needsTransform =
                            feature.geometry?.type === 'MultiPolygon' &&
                            Math.abs(feature.geometry.coordinates[0]?.[0]?.[0]?.[0] || 0) > 180

                        const geometry = needsTransform
                            ? MapConvertMeasureUtils.transformGeometryToWgs84(feature.geometry!)
                            : feature.geometry

                        const processedFeature: GeoJSONFeature = {
                            type: 'Feature',
                            geometry,
                            properties: {
                                name: feature.properties?.['name'] || 'Unnamed Region',
                                id: (
                                    feature.properties?.['id'] || Math.random().toString(36).substring(2, 9)
                                ).toString(),
                                area: 0
                            }
                        }

                        // Calculate area after feature is created
                        if (geometry) {
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

                        return processedFeature
                    })

                    // Store GeoJSON features for easy removal
                    this.selectedGeoJSONFeatures = features

                    // Update map layer
                    if (this.selectedRegionLayer) {
                        const source = this.map?.getSource(this.selectedRegionLayer.sourceId) as GeoJSONSource
                        source?.setData({ type: 'FeatureCollection', features })
                    }
                } catch (error) {
                    if (responseText.includes('ServiceException')) {
                        const xmlDoc = new DOMParser().parseFromString(responseText, 'text/xml')
                        console.error('WMS Service Exception:', xmlDoc.querySelector('ServiceException')?.textContent)
                    } else {
                        console.error('Failed to parse GetFeatureInfo response:', error)
                    }
                }
            },
            error: error => console.error('Error fetching WMS feature info:', error)
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
        this.mapDrawingService?.startDrawing(type)
    }

    stopDrawing(): void {
        this.mapDrawingService?.stopDrawing()
    }

    clearDrawnFeatures(): void {
        this.mapDrawingService?.clearDrawnFeatures()

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
            this.map.setLayoutProperty(this.regionLayer.layerId, 'visibility', 'visible')
            this.regionLayer.visible = true
        }
    }

    disableBoundarySelection(): void {
        if (this.regionLayer && this.map) {
            this.map.setLayoutProperty(this.regionLayer.layerId, 'visibility', 'none')
            this.regionLayer.visible = false
        }
    }

    private getInitialMapStyle(): string | StyleSpecification {
        const isVectorStyle = ['Graybeard', 'Colorful'].includes(this.currentBasemapStyle)
        if (isVectorStyle) {
            return `assets/map-schema/${this.currentBasemapStyle.toLowerCase()}/style.json`
        }

        return this.createRasterStyle()
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

    private addLayerSwitcher(): void {
        if (!this.map) return

        const styles: MapStyle[] = [
            { title: 'Graybeard', uri: 'assets/map-schema/graybeard/style.json' },
            { title: 'Colorful', uri: 'assets/map-schema/colorful/style.json' },
            { title: 'ESRI World Imagery', uri: this.createRasterStyle() }
        ]

        const initialExpanded = !this.storageService.getLayerSwitcherCollapsed()

        this.layerSwitcherControl = MapControlsUtils.createLayerSwitcherControl(
            styles,
            this.currentBasemapStyle,
            (styleName: string) => {
                this.currentBasemapStyle = styleName
                this.storageService.saveSelectedMapLayer(styleName)

                this.map!.once('style.load', () => {
                    if (this.mapDrawingService) {
                        this.terraDrawControl = this.mapDrawingService.initializeTerraDraw(this.map!)
                    }

                    if (this.mapDrawingService?.isDrawingModeValue && this.mapDrawingService.currentDrawModeValue) {
                        let mode: 'Box' | 'Circle' | 'Polygon'
                        switch (this.mapDrawingService.currentDrawModeValue) {
                            case 'rectangle':
                                mode = 'Box'
                                break
                            case 'circle':
                                mode = 'Circle'
                                break
                            case 'polygon':
                                mode = 'Polygon'
                                break
                            default:
                                throw new Error(`Unknown draw mode: ${this.mapDrawingService.currentDrawModeValue}`)
                        }
                        this.startDrawing(mode)
                    }
                })
            },
            (isExpanded: boolean) => {
                this.storageService.saveLayerSwitcherCollapsed(!isExpanded)
            },
            initialExpanded
        )

        this.map.addControl(this.layerSwitcherControl as IControl, 'bottom-right')
    }
}
