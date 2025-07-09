import { HttpClient } from '@angular/common/http'
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core'
import { StorageService } from '@app/storage.service'
import geojsonvt from 'geojson-vt'
import { Collection, Feature, Map, MapBrowserEvent, Overlay, View } from 'ol'
import LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import FeatureLike from 'ol/Feature'
import VectorTile from 'ol/VectorTile'
import { ScaleLine } from 'ol/control'
import { defaults as defaultControls, ZoomToExtent } from 'ol/control.js'
import { Coordinate } from 'ol/coordinate'
import { Extent } from 'ol/extent'
import { GeoJSONFeatureCollection } from 'ol/format/GeoJSON'
import GeoJSON, { GeoJSONFeature } from 'ol/format/GeoJSON.js'
import { Circle, MultiPolygon } from 'ol/geom'
import { Geometry, Polygon } from 'ol/geom.js'
import Point from 'ol/geom/Point'
import { fromCircle } from 'ol/geom/Polygon'
import { Draw, Snap } from 'ol/interaction'
import { defaults as defaultInteractions } from 'ol/interaction.js'
import { createBox, DrawEvent } from 'ol/interaction/Draw'
import VectorLayer, { Options as VectorLayerOptions } from 'ol/layer/Vector'
import VectorTileLayer, { Options as VectorTileLayerOptions } from 'ol/layer/VectorTile'
import TileLayer, { Options as TileLayerOptions } from 'ol/layer/WebGLTile.js'
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj'
import Projection from 'ol/proj/Projection'
import RenderFeature from 'ol/render/Feature'
import GeoTIFF from 'ol/source/GeoTIFF'
import OSM from 'ol/source/OSM'
import TileWMS from 'ol/source/TileWMS'
import VectorSource from 'ol/source/Vector'
import VectorTileSource from 'ol/source/VectorTile'
import XYZ from 'ol/source/XYZ'
import { getArea, getDistance } from 'ol/sphere'
import { Circle as CircleStyle, Fill, Icon, Stroke, Style } from 'ol/style'
import { StyleFunction } from 'ol/style/Style'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { environment } from 'src/environments/environment'
import { PluginService } from '../plugin/plugin.service'
import { replacer } from './utils/geojson-vt.utils'

export const MAP_ID = new InjectionToken<string>('MAP_ID')

class ExtendedTileLayer extends TileLayer {
    name?: string
    baseLayer?: boolean
    displayInLayerSwitcher?: boolean

    constructor(options: TileLayerOptions & { name?: string; baseLayer?: boolean; displayInLayerSwitcher?: boolean }) {
        super(options)
        this.name = options.name
        this.baseLayer = options.baseLayer
        this.displayInLayerSwitcher = options.displayInLayerSwitcher
    }
}

class ExtendedVectorTileLayer extends VectorTileLayer<RenderFeature> {
    name?: string
    displayInLayerSwitcher?: boolean

    constructor(options: VectorTileLayerOptions<RenderFeature> & { name?: string; displayInLayerSwitcher?: boolean }) {
        super(options)
        this.name = options.name
        this.displayInLayerSwitcher = options.displayInLayerSwitcher
    }
}

class ExtendedVectorLayer<T extends Feature<Geometry | Point>> extends VectorLayer<T> {
    name?: string
    displayInLayerSwitcher?: boolean

    constructor(options: VectorLayerOptions<T> & { name?: string; displayInLayerSwitcher?: boolean }) {
        super(options)
        this.name = options.name
        this.displayInLayerSwitcher = options.displayInLayerSwitcher
    }
}

@Injectable({
    providedIn: 'root'
})
export class MapService {
    map: Map | undefined
    mapPopUp: Overlay | undefined
    focusedLayer: ExtendedVectorLayer<Feature<MultiPolygon> | Feature<Polygon>> | undefined
    regionLayer: ExtendedTileLayer | undefined
    selectedRegionLayer: ExtendedVectorLayer<Feature<Geometry>> | undefined
    markerLayer: ExtendedVectorLayer<Feature<Point>> | undefined
    geojsonLayer: ExtendedVectorTileLayer | undefined
    featureHoverOverlay: ExtendedVectorLayer<Feature<Geometry>> | undefined
    featureClickOverlay: ExtendedVectorLayer<Feature<Geometry>> | undefined
    markerFeatures: Collection<Feature<Point>> = new Collection([])
    selectedFeatures: Collection<FeatureLike> = new Collection([])

    drawLayer: ExtendedVectorLayer<Feature<Geometry>> | undefined
    currentDrawInteraction: Draw | undefined
    snapInteraction: Snap | undefined
    isDrawingMode: boolean = false
    measureTooltipElement: HTMLElement | undefined
    measureTooltip: Overlay | undefined

    layerSwitcherCollapsed: boolean = false
    windowWidth?: number
    windowResolution?: number
    mapId: string = 'main-map'

    private orsAPIKey = environment.orsAPIKey
    static readonly sqmToSqkmFactor = 1 / 1000000

    constructor(
        private pluginService: PluginService,
        private http: HttpClient,
        private storageService: StorageService,
        @Optional() @Inject(MAP_ID) mapId?: string
    ) {
        if (mapId) {
            this.mapId = mapId
        }
        this.pluginService.computeState$.subscribe(value => {
            if (value === 'compute-ready') {
                this.enableComputeLayers()
            } else if (value === 'inactive') {
                this.removeComputeLayers()
            }
        })
    }

    goToLocation(suggestion: Feature<Point>) {
        if (suggestion) {
            this.addMarker(suggestion)
            this.fitMapViewToSearchResult(suggestion)
        }
    }

    getAutoCompleteSuggestions(query: string): Observable<Feature<Point>[]> {
        const orsUrl = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${this.orsAPIKey}&text=${query}&layers=address,venue,neighbourhood,locality,borough,localadmin,county,macrocounty`
        const gj = new GeoJSON()

        function transformer(coll: GeoJSONFeatureCollection): Feature<Point>[] {
            const feats = coll.features.map((feature: GeoJSONFeature) => {
                const feat = gj.readFeature(feature, { featureProjection: 'EPSG:3857' })
                feat.set('extent', feature.bbox ? transformExtent(feature.bbox, 'EPSG:4326', 'EPSG:3857') : undefined)
                return feat
            })
            return feats.filter(
                (feature: Feature<Geometry>) => feature.getGeometry()?.getType() == 'Point'
            ) as Feature<Point>[]
        }

        const observable: Observable<GeoJSONFeatureCollection> = this.http.get<GeoJSONFeatureCollection>(orsUrl)
        return observable.pipe(map(transformer))
    }

    addMarker(feature: Feature<Point>) {
        this.markerFeatures.clear()
        this.markerFeatures.push(feature)
    }

    fitMapViewToSearchResult(result: Feature<Point>) {
        const extent = result.get('extent') || result.getGeometry()?.getExtent()
        if (this.map && extent) {
            this.map.getView().fit(extent, {
                padding: this.calculateMapPadding(),
                maxZoom: 15
            })
        }
    }

    calculateMapPadding() {
        this.windowWidth = window.innerWidth
        this.windowResolution = window.devicePixelRatio
        const horMapPadding = 250 / this.windowResolution
        if (this.windowWidth > 2000) {
            return [horMapPadding, 200, horMapPadding, 200]
        } else if (this.windowWidth > 1600) {
            return [horMapPadding, 100, horMapPadding, 400]
        } else {
            return [horMapPadding, 100, horMapPadding, 500]
        }
    }

    initLayers() {
        this.regionLayer = new ExtendedTileLayer({
            source: new TileWMS({
                url: 'https://maps.heigit.org/ohsome/service/wms',
                params: {
                    LAYERS: 'ohsome:admin_world_water',
                    TRANSPARENT: true,
                    FORMAT: 'image/png'
                },
                attributions:
                    'Boundaries © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, Source: <a href="https://osm-boundaries.com" target="_blank">OSM Boundaries Map</a> via <a href="https://ohsome.org" target="_blank">ohsome</a>.'
            }),
            displayInLayerSwitcher: false,
            visible: false
        })

        this.selectedRegionLayer = new ExtendedVectorLayer({
            source: new VectorSource({
                features: this.selectedFeatures
            }),
            map: this.map,
            style: {
                'stroke-color': 'rgba(0, 0, 255, 0.7)',
                'stroke-width': 2,
                'fill-color': 'rgba(0, 0, 255, 0.1)'
            },
            displayInLayerSwitcher: false
        })

        this.markerLayer = new ExtendedVectorLayer<Feature<Point>>({
            source: new VectorSource({
                features: this.markerFeatures
            }),
            style: new Style({
                image: new Icon({
                    opacity: 1,
                    src: 'assets/images/map-pin.svg',
                    scale: 1.5,
                    displacement: [0, 15]
                })
            }),
            displayInLayerSwitcher: false
        })

        this.drawLayer = new ExtendedVectorLayer({
            source: new VectorSource(),
            style: {
                'stroke-color': 'rgba(0, 0, 0, 0)',
                'stroke-width': 0,
                'fill-color': 'rgba(0, 0, 0, 0)'
            },
            displayInLayerSwitcher: false
        })

        return this.selectedRegionLayer
    }

    initMap(targetId: string, isReportMap: boolean = false) {
        this.mapId = targetId

        const selectedRegionLayer: ExtendedVectorLayer<FeatureLike> = this.initLayers()

        const popupElement = this.createPopupElements()

        this.mapPopUp = new Overlay({
            element: popupElement!,
            autoPan: {
                animation: {
                    duration: 250
                }
            }
        })

        const positronLayerName = 'Carto Positron'

        const osmCarto = new ExtendedTileLayer({
            source: new OSM(),
            name: 'OSM Carto',
            baseLayer: true,
            visible: false
        })

        const aerialImagery = new ExtendedTileLayer({
            name: 'ESRI World Imagery',
            baseLayer: true,
            visible: false,
            source: new XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attributions:
                    'Powered by <a href="https://www.esri.com/" target="_blank">ESRI</a> | Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
                attributionsCollapsible: false,
                maxZoom: 19
            })
        })

        const greyscaleBase = new ExtendedTileLayer({
            name: positronLayerName,
            baseLayer: true,
            visible: true,
            source: new XYZ({
                url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                attributions:
                    '<a href="https://carto.com/" target="_blank">© CARTO</a> <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>.',
                attributionsCollapsible: false
            })
        })

        const heidelbergCoords = [8.6759928, 49.4187355]
        const initialView = new View({
            center: fromLonLat(heidelbergCoords),
            zoom: 0,
            maxZoom: 20
        })

        const customZoomOutLabel = document.createElement('span')
        customZoomOutLabel.innerHTML = '<img src="assets/images/globe.svg" style="width: 16px; height: 16px;">'

        const interactions = defaultInteractions({
            mouseWheelZoom: !isReportMap
        })

        this.map = new Map({
            layers: [aerialImagery, osmCarto, greyscaleBase],
            target: targetId,
            view: initialView,
            overlays: [this.mapPopUp],
            interactions: interactions,
            controls: defaultControls().extend([
                new ScaleLine(),
                new ZoomToExtent({
                    extent: initialView.calculateExtent(),
                    label: customZoomOutLabel,
                    tipLabel: 'Zoom out max'
                })
            ])
        })

        if (isReportMap) {
            const mapElement = this.map.getTargetElement()
            const noteId = `map-zoom-note-${targetId.replace('report-map-', '')}`
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

        const selectedMapLayer = this.storageService.getSelectedMapLayer(positronLayerName)
        this.map.getLayers().forEach(layer => {
            layer.setVisible(layer.get('name') === selectedMapLayer)
        })

        this.layerSwitcherCollapsed = this.storageService.getLayerSwitcherCollapsed()
        const layerSwitcher = new LayerSwitcher({
            collapsed: this.layerSwitcherCollapsed,
            reordering: false,
            onchangeCheck: () => {
                const visibleBaseLayer = this.map
                    ?.getLayers()
                    .getArray()
                    .find(layer => layer.getVisible() && layer.get('baseLayer') === true)
                if (visibleBaseLayer) {
                    const selectedLayerName = visibleBaseLayer.get('name')
                    if (selectedLayerName) {
                        this.storageService.saveSelectedMapLayer(selectedLayerName)
                    }
                }
            }
        })
        layerSwitcher.setHeader('<h3>Layers</h3>')
        this.map.addControl(layerSwitcher)

        layerSwitcher.on('toggle', toggleEvent => {
            this.layerSwitcherCollapsed = toggleEvent.collapsed
            this.storageService.saveLayerSwitcherCollapsed(this.layerSwitcherCollapsed)
        })

        if (this.regionLayer) {
            this.map.addLayer(this.regionLayer)
        }

        if (this.markerLayer) {
            this.map.addLayer(this.markerLayer)
        }

        this.map.addLayer(selectedRegionLayer)

        if (this.drawLayer) {
            this.map.addLayer(this.drawLayer)
        }

        this.map.on('pointermove', evt => {
            if (!this.map || evt.dragging) {
                return
            }

            const pixel = this.map.getEventPixel(evt.originalEvent)
            const hasValidFeature = this.map.hasFeatureAtPixel(pixel, {
                layerFilter: layer => {
                    return layer === this.geojsonLayer
                }
            })

            const showPointer = hasValidFeature || this.regionLayer?.getVisible()
            this.map.getTargetElement().style.cursor = showPointer ? 'pointer' : ''
        })

        this.map.on('click', evt => {
            this.selectRegions(evt.pixel)
        })

        if (!environment.production) {
            // Allow flexibility in window object for debugging in Cypress
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(window as any).olMap = this.map
        }
    }

    highlightAoI(feature: Feature<MultiPolygon>): Extent {
        this.removeComputeLayers()

        const extent = feature.getGeometry()!.getExtent()

        const scissor = feature.getGeometry()!
        const fogOfWar = this.cutFromGlobalPolygon(scissor)

        const vectorSource = new VectorSource({
            features: [feature, fogOfWar]
        })

        const aoiStyle = new Style({
            stroke: new Stroke({
                color: '#008080',
                width: 3
            })
        })

        const fowStyle = new Style({ fill: new Fill({ color: '#80808050' }) })

        this.focusedLayer = new ExtendedVectorLayer({
            source: vectorSource,
            style: function (feature) {
                return feature.get('renderStyle') == 'AOI' ? aoiStyle : fowStyle
            },
            displayInLayerSwitcher: false
        })

        this.map?.addLayer(this.focusedLayer)
        return extent
    }

    cutFromGlobalPolygon(scissor: MultiPolygon): Feature<Polygon> {
        const global = new Polygon([
            [
                [-180, -90],
                [180, -90],
                [180, 90],
                [-180, 90],
                [-180, -90]
            ].map(coordinate => fromLonLat(coordinate))
        ])

        const clipped = new Polygon([
            global.getLinearRing(0)!.getCoordinates(),
            ...scissor.getPolygons().map(polygon => polygon.getLinearRing(0)!.getCoordinates())
        ])

        return new Feature({ name: 'FogOfWar', geometry: clipped })
    }

    addGeoJsonLayer(data: object, artifactName: string): ExtendedVectorTileLayer {
        const tileIndex = geojsonvt(data, {
            extent: 4096,
            maxZoom: 20
        })

        const format = new GeoJSON({
            dataProjection: new Projection({
                code: 'TILE_PIXELS',
                units: 'tile-pixels',
                extent: [0, 0, 4096, 4096]
            })
        })

        const vectorSource = new VectorTileSource({
            tileUrlFunction: function (tileCoord) {
                return JSON.stringify(tileCoord)
            },
            tileLoadFunction: (tile, url) => {
                const tileCoord = JSON.parse(url)
                const [x, y, zoom] = tileCoord
                const data = tileIndex.getTile(x, y, zoom)
                const geojson = JSON.stringify(
                    {
                        type: 'FeatureCollection',
                        features: data ? data.features : []
                    },
                    replacer
                )

                const tileFeatures = format.readFeatures(geojson, {
                    extent: vectorSource.getTileGrid()?.getTileCoordExtent(tileCoord),
                    featureProjection: 'EPSG:3857'
                })
                ;(tile as VectorTile).setFeatures(tileFeatures)
            }
        })

        this.geojsonLayer = new ExtendedVectorTileLayer({
            source: vectorSource,
            name: artifactName,
            style: this.styleFunction.bind(this) as StyleFunction
        })
        this.geojsonLayer.setOpacity(0.8)

        this.map?.addLayer(this.geojsonLayer)

        const features = format.readFeatures(data, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        })

        const geojsonLayerSource = new VectorSource({
            features: features
        })

        const originalGeojsonLayer = new VectorLayer({
            source: geojsonLayerSource
        })

        this.featureHoverOverlay = this.createFeatureOverlay(0.5)
        this.featureClickOverlay = this.createFeatureOverlay(0.75)
        if (this.featureHoverOverlay) {
            this.map?.addLayer(this.featureHoverOverlay)
        }
        if (this.featureClickOverlay) {
            this.map?.addLayer(this.featureClickOverlay)
        }

        this.map?.on(
            'pointermove',
            function (this: MapService, evt: MapBrowserEvent<PointerEvent>) {
                if (!this.featureHoverOverlay) return

                const features = this.getFeaturesAtPixel(evt.pixel, originalGeojsonLayer)
                this.handleFeaturesTooltip(features, this.featureHoverOverlay)
            }.bind(this)
        )

        this.map?.on(
            'click',
            function (this: MapService, evt: MapBrowserEvent<PointerEvent>) {
                const pixel = this.map?.getEventPixel(evt.originalEvent)
                if (!pixel) return

                this.geojsonLayer?.getFeatures(pixel).then(features => {
                    if (this.featureClickOverlay) {
                        this.handleFeaturesTooltip(features, this.featureClickOverlay, evt.coordinate, artifactName)
                    }
                })
            }.bind(this)
        )

        return this.geojsonLayer
    }

    styleFunction(feature: FeatureLike, resolution: number): Style {
        const widthUnits = 15
        const strokeWidth = Math.min(Math.max(Math.pow(1.15, widthUnits / resolution), 1.5), 5)
        const color = feature.get('color')
        let strokeColor = [0, 0, 0, 1]

        const geom = feature.getGeometry()
        if (geom && (geom.getType() == 'LineString' || geom.getType() == 'MultiLineString')) {
            strokeColor = color
        }

        return new Style({
            fill: new Fill({
                color: color
            }),
            stroke: new Stroke({
                color: strokeColor,
                width: strokeWidth
            }),
            image: new CircleStyle({
                radius: 5,
                stroke: new Stroke({
                    color: strokeColor
                }),
                fill: new Fill({
                    color: color
                })
            })
        })
    }

    async addGeoTiffLayer(sourceURL: string, artifactName: string | undefined) {
        const geoTiffSource = new GeoTIFF({
            sources: [
                {
                    url: sourceURL,
                    // The following options are due to https://github.com/openlayers/openlayers/issues/15894
                    bands: [1, 2, 3],
                    nodata: 0
                }
            ],
            convertToRGB: true,
            interpolate: false
        })

        await geoTiffSource.getView()

        const geoTiffLayer = new ExtendedTileLayer({
            source: geoTiffSource,
            name: artifactName
        })
        geoTiffLayer.setOpacity(0.8)

        this.map?.addLayer(geoTiffLayer)
        return geoTiffLayer
    }

    removeComputeLayers(): void {
        if (this.regionLayer) {
            this.regionLayer.setVisible(false)
        }
        if (this.selectedRegionLayer) {
            this.selectedRegionLayer.setVisible(false)
        }
        if (this.selectedFeatures.getLength() > 0) {
            this.selectedFeatures.clear()
        }
        if (this.drawLayer) {
            this.drawLayer.setVisible(false)
        }
    }

    removeFocusedLayer(): void {
        if (this.focusedLayer) {
            this.map?.removeLayer(this.focusedLayer)
            this.focusedLayer = undefined
        }
    }

    enableComputeLayers() {
        if (this.map) {
            if (this.regionLayer) {
                this.regionLayer.setVisible(true)
            }
            if (this.selectedRegionLayer) {
                this.selectedRegionLayer.setVisible(true)
            }
            if (this.drawLayer) {
                this.drawLayer.setVisible(true)
            }
        }
    }

    selectRegions(pixel: Array<number>) {
        if (this.regionLayer?.getVisible() && this.map) {
            const source = this.regionLayer.getSource() as TileWMS
            const resolution = this.map.getView().getResolution()
            const projection = this.map.getView().getProjection()

            if (resolution) {
                const url = source.getFeatureInfoUrl(this.map.getCoordinateFromPixel(pixel), resolution, projection, {
                    INFO_FORMAT: 'application/json',
                    FEATURE_COUNT: 10
                })

                if (url) {
                    this.http.get<GeoJSONFeatureCollection>(url).subscribe(response => {
                        if (response.features && response.features.length > 0) {
                            this.selectedFeatures.clear()
                            response.features.forEach((geoJsonFeature: GeoJSONFeature) => {
                                const feature = new GeoJSON().readFeature(geoJsonFeature)
                                feature.set('name', feature.get('name') || 'Unnamed Region')
                                feature.set(
                                    'id',
                                    (feature.get('id') || Math.random().toString(36).substring(2, 9)).toString()
                                )
                                const geometry = feature.getGeometry()
                                feature.set(
                                    'area',
                                    geometry ? Number((getArea(geometry) * MapService.sqmToSqkmFactor).toFixed(2)) : 0
                                )
                                this.selectedFeatures.push(feature)
                            })
                        }
                    })
                }
            }
        }
    }

    getSelectedRegion(): GeoJSONFeature | null {
        const feature = this.selectedFeatures.getLength() > 0 ? this.selectedFeatures.item(0) : undefined
        if (feature) {
            return new GeoJSON().writeFeatureObject(feature, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
                decimals: 7
            })
        }
        return null
    }

    getSelectedRegions(): Feature[] {
        return this.selectedFeatures.getArray()
    }

    removeSelectedRegion(feature: Feature): void {
        this.selectedFeatures.remove(feature)
    }

    private createPopupElements() {
        const mapContainer = document.getElementById(this.mapId)
        if (!mapContainer) return

        const popupElement = document.createElement('div')
        popupElement.id = `map-popup-${this.mapId}`
        popupElement.className = 'ol-popup'

        const popupContent = document.createElement('div')
        popupContent.id = `map-popup-content-${this.mapId}`
        popupContent.className = 'ol-popup-content'

        popupElement.appendChild(popupContent)
        mapContainer.appendChild(popupElement)

        return popupElement
    }

    private createMeasureTooltip() {
        if (this.measureTooltipElement) {
            this.measureTooltipElement.parentNode?.removeChild(this.measureTooltipElement)
        }
        this.measureTooltipElement = document.createElement('div')
        this.measureTooltipElement.className = 'ol-tooltip'
        this.measureTooltip = new Overlay({
            element: this.measureTooltipElement,
            offset: [0, -15],
            positioning: 'bottom-center',
            stopEvent: false,
            insertFirst: false
        })
        this.map?.addOverlay(this.measureTooltip)
    }

    createFeatureOverlay(opacity: number): ExtendedVectorLayer<Feature<Geometry>> {
        const highlightStrokeWidth = 15
        return new ExtendedVectorLayer({
            source: new VectorSource(),
            style: new Style({
                stroke: new Stroke({
                    color: `rgba(255, 255, 255, ${opacity})`,
                    width: highlightStrokeWidth
                }),
                image: new CircleStyle({
                    radius: 5,
                    stroke: new Stroke({
                        color: `rgba(255, 255, 255, ${opacity})`,
                        width: highlightStrokeWidth
                    })
                })
            }),
            displayInLayerSwitcher: false
        })
    }

    handleFeaturesTooltip(
        features: Array<Feature<Geometry> | RenderFeature>,
        overlay: ExtendedVectorLayer<Feature<Geometry>>,
        coordinate?: Coordinate,
        artifactName?: string
    ) {
        const popupContent = document.getElementById(`map-popup-content-${this.mapId}`)!
        if (features.length > 0) {
            overlay.getSource()?.clear()
            overlay.getSource()?.addFeatures(features as Feature<Geometry>[])

            if (coordinate) {
                popupContent.innerHTML =
                    '<span><strong>' +
                    artifactName +
                    '</strong> : ' +
                    features.map(feature => feature.get('label')) +
                    '</span>'
                this.mapPopUp?.setPosition(coordinate)
            }
        } else {
            overlay.getSource()?.clear()
            if (coordinate) {
                this.mapPopUp?.setPosition(undefined)
            }
        }
    }

    getFeaturesAtPixel(
        pixel: number[],
        originalGeojsonLayer: ExtendedVectorLayer<Feature<Geometry>>
    ): Array<Feature<Geometry>> {
        const features: Array<Feature<Geometry>> = []

        this.map?.forEachFeatureAtPixel(pixel, feature => {
            if (feature.getId()) {
                const originalFeature = originalGeojsonLayer.getSource()?.getFeatureById(feature.getId() as number)
                if (originalFeature) {
                    features.push(originalFeature as Feature<Geometry>)
                }
            }
        })

        return features
    }

    startDrawing(type: 'Polygon' | 'Circle' | 'Box'): void {
        this.stopDrawing()

        if (!this.map || !this.drawLayer) return

        const drawConfig = this.getDrawConfiguration(type)
        this.currentDrawInteraction = new Draw({
            source: this.drawLayer.getSource() as VectorSource,
            style: new Style({
                fill: new Fill({
                    color: 'rgba(231, 138, 195, 0.1)'
                }),
                stroke: new Stroke({
                    color: 'rgba(231, 138, 195, 1)',
                    width: 2
                })
            }),
            ...drawConfig,
            stopClick: false,
            freehand: false
        })

        this.currentDrawInteraction.on('drawstart', (event: DrawEvent) => {
            this.createMeasureTooltip()
            const feature = event.feature
            let tooltipCoord: Coordinate = [0, 0]
            feature.getGeometry()?.on('change', evt => {
                const geom = evt.target
                if (geom instanceof Circle) {
                    const center = geom.getCenter()
                    const edge = geom.getLastCoordinate()
                    const centerGeo = toLonLat(center)
                    const edgeGeo = toLonLat(edge)
                    const radius = getDistance(centerGeo, edgeGeo)

                    tooltipCoord = edge
                    this.measureTooltipElement!.innerHTML = '<span>Radius: ' + this.formatRadius(radius) + '</span>'
                    this.measureTooltip?.setPosition(tooltipCoord)
                }
            })
        })

        this.currentDrawInteraction.on('drawend', (event: DrawEvent) => {
            this.measureTooltipElement?.remove()
            const feature = event.feature as Feature<Geometry>
            this.onDrawEnd(feature, type)
        })

        this.setupDrawingInteractions()
        this.isDrawingMode = true
    }

    private getDrawConfiguration(type: 'Polygon' | 'Circle' | 'Box') {
        switch (type) {
            case 'Circle':
                return { type: 'Circle' as const }
            case 'Box':
                return {
                    type: 'Circle' as const,
                    geometryFunction: createBox()
                }
            case 'Polygon':
                return { type: 'Polygon' as const }
            default:
                throw new Error(`Unsupported drawing type: ${type}`)
        }
    }

    private formatRadius(radius: number): string {
        if (radius > 1000) {
            return `${(radius / 1000).toFixed(2)} km`
        } else {
            return `${radius.toFixed(0)} m`
        }
    }

    private setupDrawingInteractions(): void {
        if (!this.map || !this.drawLayer) return

        this.map.addInteraction(this.currentDrawInteraction!)

        this.snapInteraction = new Snap({
            source: this.drawLayer.getSource() as VectorSource
        })
        this.map.addInteraction(this.snapInteraction)
    }

    stopDrawing(): void {
        if (this.map) {
            if (this.currentDrawInteraction) {
                this.map.removeInteraction(this.currentDrawInteraction)
                this.currentDrawInteraction = undefined
            }
            if (this.snapInteraction) {
                this.map.removeInteraction(this.snapInteraction)
                this.snapInteraction = undefined
            }
        }
        this.measureTooltipElement?.remove()
        this.isDrawingMode = false
    }

    clearDrawnFeatures(): void {
        if (this.drawLayer) {
            this.drawLayer.getSource()?.clear()
        }
        this.selectedFeatures.clear()
    }

    private onDrawEnd(feature: Feature<Geometry>, originalType: 'Polygon' | 'Circle' | 'Box'): void {
        feature.set('name', 'Custom Area')
        feature.set('originalType', originalType)
        feature.set('id', Math.random().toString(36).substring(2, 9).toString())

        const geometry = feature.getGeometry()
        if (geometry) {
            let convertedGeometry: MultiPolygon

            if (geometry.getType() === 'Circle') {
                const circle = geometry as Circle
                const polygon = fromCircle(circle)

                convertedGeometry = new MultiPolygon([polygon.getCoordinates()])
            } else if (geometry.getType() === 'Polygon') {
                const polygon = geometry as Polygon

                convertedGeometry = new MultiPolygon([polygon.getCoordinates()])
            } else {
                if (geometry.getType() === 'MultiPolygon') {
                    convertedGeometry = geometry as MultiPolygon
                } else {
                    throw new Error(`Unsupported geometry type for conversion to MultiPolygon: ${geometry.getType()}`)
                }
            }

            const area = getArea(convertedGeometry) * MapService.sqmToSqkmFactor

            feature.set('area', Number(area.toFixed(2)))
            feature.setGeometry(convertedGeometry)
        }

        this.selectedFeatures.push(feature)
        this.stopDrawing()
    }

    enableBoundarySelection(): void {
        if (this.regionLayer) {
            this.regionLayer.setVisible(true)
        }
    }

    disableBoundarySelection(): void {
        if (this.regionLayer) {
            this.regionLayer.setVisible(false)
        }
    }
}
