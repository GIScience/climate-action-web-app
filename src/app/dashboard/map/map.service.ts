import {Injectable} from '@angular/core'
import {HttpClient} from '@angular/common/http'
import {Collection, Feature, Map, MapBrowserEvent, Overlay, View} from 'ol'
import {PluginService} from '../plugin/plugin.service'
import FeatureLike from 'ol/Feature'
import TileLayer, {Options as TileLayerOptions} from 'ol/layer/WebGLTile.js'
import TileWMS from 'ol/source/TileWMS'
import {fromLonLat} from 'ol/proj'
import {Geometry, Polygon} from 'ol/geom.js'
import {Observable} from 'rxjs'
import {Coordinate} from 'ol/coordinate'
import GeoJSON, {GeoJSONFeature} from 'ol/format/GeoJSON.js'
import GeoTIFF from 'ol/source/GeoTIFF'
import {GeoJSONFeatureCollection} from 'ol/format/GeoJSON'
import VectorLayer, {Options as VectorLayerOptions} from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import Point from 'ol/geom/Point'
import {easeIn} from 'ol/easing.js'
import {createEmpty, extend, Extent} from 'ol/extent'
import {Circle as CircleStyle, Fill, Stroke, Style, Icon} from 'ol/style'
import LayerSwitcher from 'ol-ext/control/LayerSwitcher'
import XYZ from 'ol/source/XYZ'
import TileGrid from 'ol/tilegrid/TileGrid'
import {StyleFunction} from 'ol/style/Style'
import {MultiPolygon} from 'ol/geom'
import {map} from 'rxjs/operators'
import {environment} from 'src/environments/environment'
import geojsonvt from 'geojson-vt'
import VectorTile from 'ol/VectorTile'
import VectorTileSource from 'ol/source/VectorTile'
import VectorTileLayer, {Options as VectorTileLayerOptions} from 'ol/layer/VectorTile'
import Projection from 'ol/proj/Projection'
import RenderFeature from 'ol/render/Feature'
import {replacer} from './utils/geojson-vt.utils'

class ExtendedTileLayer extends TileLayer {
    name?: string
    baseLayer?: boolean
    displayInLayerSwitcher?: boolean

    constructor(options: TileLayerOptions & {name?: string; baseLayer?: boolean; displayInLayerSwitcher?: boolean}) {
        super(options)
        this.name = options.name
        this.baseLayer = options.baseLayer
        this.displayInLayerSwitcher = options.displayInLayerSwitcher
    }
}

class ExtendedVectorTileLayer extends VectorTileLayer<RenderFeature> {
    name?: string
    displayInLayerSwitcher?: boolean

    constructor(options: VectorTileLayerOptions<RenderFeature> & {name?: string; displayInLayerSwitcher?: boolean}) {
        super(options)
        this.name = options.name
        this.displayInLayerSwitcher = options.displayInLayerSwitcher
    }
}

class ExtendedVectorLayer<T extends Feature<Geometry | Point>> extends VectorLayer<T> {
    name?: string
    displayInLayerSwitcher?: boolean

    constructor(options: VectorLayerOptions<T> & {name?: string; displayInLayerSwitcher?: boolean}) {
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
    focusedLayer: ExtendedVectorLayer<Feature<Geometry>> | undefined
    regionLayer: ExtendedTileLayer | undefined
    markerLayer: ExtendedVectorLayer<Feature<Point>> | undefined
    featureHoverOverlay: ExtendedVectorLayer<Feature<Geometry>> | undefined
    featureClickOverlay: ExtendedVectorLayer<Feature<Geometry>> | undefined
    markerFeatures: Collection<Feature<Point>> = new Collection([])
    highlightedFeatures: Collection<FeatureLike> = new Collection([])
    styleCache: { [key: number]: Style } = {}
    initialExtent!: Extent
    layerSwitcherCollapsed: boolean = false
    windowWidth?: number
    windowResolution?: number
    mapPadding?: number[]

    private orsAPIKey = environment.orsAPIKey

    constructor(
        private pluginService: PluginService,
        private http: HttpClient
    ) {
        this.pluginService.resetZoom$.subscribe(() => this.resetZoomLevel())
    }

    searchLocation(query: string) {
        const orsUrl = `https://api.openrouteservice.org/geocode/search?api_key=${this.orsAPIKey}&text=${query}`
    
        this.http.get<GeoJSONFeatureCollection>(orsUrl).subscribe(results => {
            if (results.features) {
                const result = results.features[0]
                const lon = result.geometry.coordinates[0]
                const lat = result.geometry.coordinates[1]
                const coord = fromLonLat([lon, lat]) as [number, number]
                this.addMarker(coord)
                this.fitMapViewToSearchResult(result, coord)
            }
        })
    }
    
    getAutoCompleteSuggestions(query: string): Observable<GeoJSONFeatureCollection[]> {
        const orsUrl = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${this.orsAPIKey}&text=${query}&layers=address,venue,neighbourhood,locality,borough,localadmin,county,macrocounty`
        return this.http.get<GeoJSONFeatureCollection>(orsUrl).pipe(
            map(results => results.features)
        )
    }

    highlightLocationOnMap(coordinates: Coordinate) {
        const coord = fromLonLat(coordinates) as [number, number]
        this.addMarker(coord)
    }
    
    addMarker(coord: Coordinate) {
        this.markerFeatures.clear()
    
        const markerFeature = new Feature({
            geometry: new Point(coord)
        })
    
        this.markerFeatures.push(markerFeature)
    }

    fitMapViewToSearchResult(result: GeoJSONFeatureCollection, coord: [number, number]) {
        if (result.bbox) {
            const extent = [
                ...fromLonLat([result.bbox[0], result.bbox[1]]),
                ...fromLonLat([result.bbox[2], result.bbox[3]])
            ]
            if (this.map) {
                this.map.getView().fit(extent, {
                    padding: this.calculateMapPadding()
                })
            }
        } else {
            if (this.map) {
                const extent = createEmpty()
                extend(extent, [coord[0], coord[1], coord[0], coord[1]])
                this.map.getView().fit(extent, {
                    padding: this.calculateMapPadding(),
                    maxZoom: 15
                })
            }
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
                    'LAYERS': 'ohsome:admin_world_water',
                    'TRANSPARENT': true,
                    'FORMAT': 'image/png'
                },
                attributions: 'Boundaries © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, Source: <a href="https://osm-boundaries.com" target="_blank">OSM Boundaries Map</a> via <a href="https://ohsome.org" target="_blank">ohsome</a>.'
            }),
            displayInLayerSwitcher: false
        })

        const selectedRegionLayer = new ExtendedVectorLayer({
            source: new VectorSource({
                features: this.highlightedFeatures
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
    
        return selectedRegionLayer
    }

    initMap() {
        const selectedRegionLayer: ExtendedVectorLayer<FeatureLike> = this.initLayers()
        const localStorageSelectedMapLayerKey = 'selected_map_layer'
        const localStorageLayerSwitcherStateKey = 'layer_switcher_collapsed'
        const osmCartoLayerName = 'OSM Carto'

        const osmCarto = new ExtendedTileLayer({
            source: new OSM(),
            name: osmCartoLayerName,
            baseLayer: true,
            visible: true
        })

        const heigitCarto = new ExtendedTileLayer({
            name: 'HeiGIT Carto',
            baseLayer: true,
            visible: false,
            source: new XYZ({
                tileGrid: new TileGrid({
                    extent: [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244],
                    resolutions: [78271.51696402048, 39135.75848201024, 19567.87924100512, 9783.93962050256, 4891.96981025128, 2445.98490512564, 1222.99245256282, 611.49622628141, 305.748113140705, 152.8740565703525, 76.43702828517625, 38.21851414258813, 19.109257071294063, 9.554628535647032, 4.777314267823516, 2.388657133911758, 1.194328566955879, 0.5971642834779395, 0.29858214173896974]
                }),
                url: 'https://maps.heigit.org/osm-wms/tms/1.0.0/osm_auto:all/webmercator/{z}/{x}/{-y}.png',
                attributions: 'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors | Service © <a href="https://heigit.org" target="_blank">HeiGIT</a> @ <a href="https://www.uni-heidelberg.de/" target="_blank">Heidelberg University</a>.',
                attributionsCollapsible: false
            })
        })

        const aerialImagery = new ExtendedTileLayer({
            name: 'Bing Aerial Imagery',
            baseLayer: true,
            visible: false,
            source: new XYZ({
                tileGrid: new TileGrid({
                    extent: [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244],
                    resolutions: [78271.51696402048, 39135.75848201024, 19567.87924100512, 9783.93962050256, 4891.96981025128, 2445.98490512564, 1222.99245256282, 611.49622628141, 305.748113140705, 152.8740565703525, 76.43702828517625, 38.21851414258813, 19.109257071294063, 9.554628535647032, 4.777314267823516, 2.388657133911758, 1.194328566955879, 0.5971642834779395, 0.29858214173896974]
                }),
                url: 'https://maps.heigit.org/sketch-map-tool/tms/1.0.0/world_imagery/webmercator/{z}/{x}/{-y}.png',
                attributions: 'Satellite layer powered by ESRI, Source: Geobasis-DE / LVermGeoRP, Maxar, Microsoft.',
                attributionsCollapsible: false
            })
        })

        this.mapPopUp = new Overlay({
            element: document.getElementById('map-popup')!,
            autoPan: {
                animation: {
                    duration: 250
                }
            }
        })

        this.map = new Map({
            layers: [aerialImagery, heigitCarto, osmCarto],
            target: 'map',
            view: new View({
                center: fromLonLat([8.6759928, 49.4187355]),
                zoom: 0
            }),
            overlays: [this.mapPopUp]
        })

        const selectedMapLayer = localStorage.getItem(localStorageSelectedMapLayerKey) || osmCartoLayerName
        this.map.getLayers().forEach(layer => {
            layer.setVisible(layer.get('name') === selectedMapLayer)
        })

        this.layerSwitcherCollapsed = (localStorage.getItem(localStorageLayerSwitcherStateKey) === 'true')
        const layerSwitcher = new LayerSwitcher({
            collapsed: this.layerSwitcherCollapsed,
            reordering: false,
            onchangeCheck: () => {
                const visibleBaseLayer = this.map?.getLayers().getArray().find(layer => layer.getVisible() && layer.get('baseLayer') === true)
                if (visibleBaseLayer) {
                    const selectedLayerName = visibleBaseLayer.get('name')
                    localStorage.setItem(localStorageSelectedMapLayerKey, selectedLayerName || '')
                }
            }
        })
        layerSwitcher.setHeader('<h3>Layers</h3>')
        this.map.addControl(layerSwitcher)

        layerSwitcher.on('toggle', (toggleEvent) => {
            this.layerSwitcherCollapsed = toggleEvent.collapsed
            localStorage.setItem(localStorageLayerSwitcherStateKey, this.layerSwitcherCollapsed.toString())
        })

        const view = this.map.getView()
        this.initialExtent = view.calculateExtent()

        if (this.regionLayer) {
            this.map.addLayer(this.regionLayer)
        }

        if (this.markerLayer) {
            this.map.addLayer(this.markerLayer)
        }

        this.map.addLayer(selectedRegionLayer)

        this.map.on('pointermove', evt => {
            if (!this.map || evt.dragging) {
                return
            }

            const pixel = this.map.getEventPixel(evt.originalEvent)
            const showPointer = this.map.hasFeatureAtPixel(pixel) || this.regionLayer?.getVisible()

            this.map.getTargetElement().style.cursor = showPointer ? 'pointer' : ''
        })

        this.map.on('click', (evt) => {
            this.selectRegions(evt.pixel)
        })

        if (!environment.production) {
            // Allow flexibility in window object for debugging in Cypress
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).olMap = this.map
        }
    }

    highlightAoI(data: object): Extent {
        this.removeComputeLayers()

        const features = new GeoJSON().readFeatures(data, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        })

        const extent = features[0].getGeometry()!.getExtent()

        const scissor = features[0].getGeometry()! as MultiPolygon
        const fogOfWar = this.cutFromGlobalPolygon(scissor)
        features.push(fogOfWar)

        const geojsonLayerSource = new VectorSource({
            features: features
        })

        const aoiStyle = new Style({
            stroke: new Stroke({
                color: '#008080',
                width: 3
            })
        })

        const fowStyle = new Style({fill: new Fill({color: '#80808050'})})

        this.focusedLayer = new ExtendedVectorLayer({
            source: geojsonLayerSource,
            style: function (feature) {
                return feature.get('name') == 'AOI' ? aoiStyle : fowStyle
            },
            displayInLayerSwitcher: false
        })

        this.map?.addLayer(this.focusedLayer)
        return extent
    }

    cutFromGlobalPolygon(scissor: MultiPolygon): Feature<Polygon> {
        const global = new Polygon([[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]].map(coordinate => fromLonLat(coordinate))])

        const clipped = new Polygon([
            global.getLinearRing(0)!.getCoordinates(),
            ...scissor.getPolygons().map(polygon => polygon.getLinearRing(0)!.getCoordinates())
        ])

        return new Feature({'name': 'FogOfWar', 'geometry': clipped})

    }

    addGeoJsonLayer(data: object, artifactName: string): ExtendedVectorTileLayer {
        const tileIndex = geojsonvt(data, {
            extent: 4096,
            maxZoom: 18
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
                const geojson = JSON.stringify({
                    type: 'FeatureCollection',
                    features: data ? data.features : []
                }, replacer)
    
                const tileFeatures = format.readFeatures(geojson, {
                    extent: vectorSource.getTileGrid()?.getTileCoordExtent(tileCoord),
                    featureProjection: 'EPSG:3857'
                });
                (tile as VectorTile).setFeatures(tileFeatures)
            }
        })
    
        const geojsonLayer = new ExtendedVectorTileLayer({
            source: vectorSource,
            name: artifactName,
            style: this.styleFunction.bind(this) as StyleFunction
        })

        this.map?.addLayer(geojsonLayer)

        this.featureHoverOverlay = this.createFeatureOverlay(0.5)
        this.featureClickOverlay = this.createFeatureOverlay(0.75)
        if (this.featureHoverOverlay) {
            this.map?.addLayer(this.featureHoverOverlay)
        }
        if (this.featureClickOverlay) {
            this.map?.addLayer(this.featureClickOverlay)
        }

        this.map?.on('pointermove', function (this: MapService, evt: MapBrowserEvent<PointerEvent>) {
            const pixel = this.map?.getEventPixel(evt.originalEvent)
            if (!pixel) return

            geojsonLayer.getFeatures(pixel).then(features => {
                if (this.featureHoverOverlay) {
                    this.handleFeaturesTooltip(features, this.featureHoverOverlay)
                }
            })
        }.bind(this))

        this.map?.on('click', function (this: MapService, evt: MapBrowserEvent<PointerEvent>) {
            const pixel = this.map?.getEventPixel(evt.originalEvent)
            if (!pixel) return

            geojsonLayer.getFeatures(pixel).then(features => {
                if (this.featureClickOverlay) {
                    this.handleFeaturesTooltip(features, this.featureClickOverlay, evt.coordinate, artifactName)
                }
            })
        }.bind(this))

        return geojsonLayer
    }

    styleFunction(feature: FeatureLike, resolution: number): Style {
        const widthUnits = 15
        const strokeWidth = Math.min(Math.max(Math.pow(1.25, widthUnits / resolution), 1.5), 15)
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

        this.map?.addLayer(geoTiffLayer)
        return geoTiffLayer
    }

    removeComputeLayers(): void {
        if (this.regionLayer) {
            this.regionLayer.setVisible(false)
        }
        if (this.highlightedFeatures.getLength() > 0) {
            this.highlightedFeatures.clear()
        }
    }

    removeFocusedLayer(): void {
        if (this.focusedLayer) {
            this.map?.removeLayer(this.focusedLayer)
            this.focusedLayer = undefined
        }
    }

    resetZoomLevel() {
        if (this.map) {
            this.map.getView().fit(this.initialExtent, {
                duration: 1000,
                easing: easeIn,
                maxZoom: 1
            })

            if (this.regionLayer) {
                this.regionLayer.setVisible(true)
            }

        }
    }

    selectRegions(pixel: Array<number>) {
        if (this.regionLayer && this.map) {
            const source = this.regionLayer.getSource() as TileWMS
            const resolution = this.map.getView().getResolution()
            const projection = this.map.getView().getProjection()
            
            if (resolution) {
                const url = source.getFeatureInfoUrl(
                    this.map.getCoordinateFromPixel(pixel),
                    resolution,
                    projection,
                    {'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 10}
                )
                
                if (url) {
                    this.http.get<GeoJSONFeatureCollection>(url).subscribe(response => {
                        if (response.features && response.features.length > 0) {
                            this.highlightedFeatures.clear()
                            response.features.forEach((geoJsonFeature: GeoJSONFeature) => {
                                const feature = new GeoJSON().readFeature(geoJsonFeature)
                                this.highlightedFeatures.push(feature)
                            })
                        }
                    })
                }
            }
        }
    }

    getSelectedRegion(): GeoJSONFeatureCollection {
        const feature = this.highlightedFeatures.getLength() > 0 ? this.highlightedFeatures.item(0) : undefined
        if (feature) {
            feature.set('id', (feature.get('id') || Math.random().toString(36).substring(2, 9)).toString())
            feature.set('name', feature.get('name') || 'Unnamed Region')
            return new GeoJSON().writeFeatureObject(feature, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
                decimals: 7
            })
        }
        return undefined
    }

    getSelectedRegions(): Feature[] {
        return this.highlightedFeatures.getArray()
    }

    removeSelectedRegion(feature: Feature): void {
        this.highlightedFeatures.remove(feature)
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

        const popupContent = document.getElementById('map-popup-content')!
        if (features.length > 0) {
            overlay.getSource()?.clear()
            overlay.getSource()?.addFeatures(features as Feature<Geometry>[])

            if (coordinate) {
                popupContent.innerHTML = '<span><strong>' + artifactName + '</strong> : ' +
                    features.map(feature => feature.get('label')) + '</span>'
                this.mapPopUp?.setPosition(coordinate)
            }
        } else {
            overlay.getSource()?.clear()
            if (coordinate) {
                this.mapPopUp?.setPosition(undefined)
            }
        }
    }
}