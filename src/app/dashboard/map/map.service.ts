import {Injectable} from '@angular/core'
import {Collection, Feature, Map, View} from 'ol'
import {PluginService} from '../plugin/plugin.service' 
import FeatureLike from 'ol/Feature'
import TileLayer from 'ol/layer/WebGLTile.js'
import {fromLonLat} from 'ol/proj'
import {Geometry} from 'ol/geom.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import GeoTIFF from 'ol/source/GeoTIFF'
import {GeoJSONFeatureCollection} from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import Cluster from 'ol/source/Cluster'
import Point from 'ol/geom/Point'
import {easeIn} from 'ol/easing.js'
import {createEmpty, extend, Extent, getCenter} from 'ol/extent'
import {Circle as CircleStyle, Fill, Stroke, Style, Text} from 'ol/style'
import {StyleFunction} from 'ol/style/Style'

@Injectable({
    providedIn: 'root'
})
export class MapService {
    map: Map | undefined
    focusedLayer: VectorLayer<Feature<Geometry>> | undefined
    regionLayer: VectorLayer<Feature<Geometry>> | undefined
    clusterLayer: VectorLayer<Feature<Geometry>> | undefined
    highlightedFeatures: Collection<FeatureLike> = new Collection([])
    styleCache: { [key: number]: Style } = {}
    initialExtent!: Extent

    constructor(private pluginService: PluginService) {
        this.pluginService.resetZoom$.subscribe(() => this.resetZoomLevel())
    }

    assembleMap(clusterToPolygonSwitchZoom = 7) {
        const selectedRegionLayer = this.initLayers(clusterToPolygonSwitchZoom)
        this.initMap(selectedRegionLayer)
    }

    initLayers(clusterToPolygonSwitchZoom: number) {
        const ROISource = new VectorSource({
            format: new GeoJSON(),
            url: 'assets/geodata/regions-of-interest.json'
        })

        const clusterSource = new Cluster({
            source: ROISource,
            // @ts-ignore docs say null can be returned!
            geometryFunction: (feature) => {
                const geom = feature.getGeometry()
                if (!geom) return null
                return new Point(getCenter(geom.getExtent()))
            }
        })

        this.regionLayer = new VectorLayer({
            minZoom: clusterToPolygonSwitchZoom,
            source: ROISource,
            style: new Style({
                fill: new Fill({ color: 'rgba(0, 0, 0, 0.1)' }),
                stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.7)', width: 2 })
            })
        })

        const selectedRegionLayer = new VectorLayer({
            source: new VectorSource({
                features: this.highlightedFeatures
            }),
            map: this.map,
            style: {
                'stroke-color': 'rgba(0, 0, 255, 0.7)',
                'stroke-width': 2,
                'fill-color': 'rgba(0, 0, 255, 0.1)'
            }
        })

        this.clusterLayer = new VectorLayer({
            maxZoom: clusterToPolygonSwitchZoom,
            source: clusterSource,
            //@ts-ignore typechecker error: FeatureLike down-typed to Feature<Geometry>
            style: (clusterFeature, resolution) => this.getClusterStyle(clusterFeature, resolution)
        })

        return selectedRegionLayer
    }

    initMap(selectedRegionLayer: VectorLayer<FeatureLike>) {
        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM()
                })
            ],
            target: 'map',
            view: new View({
                center: fromLonLat([8.6759928, 49.4187355]),
                zoom: 0
            })
        })

        const view = this.map.getView()
        this.initialExtent = view.calculateExtent()

        if (this.regionLayer) {
            this.map.addLayer(this.regionLayer)
        }
        
        if (this.clusterLayer) {
            this.map.addLayer(this.clusterLayer)
        }

        this.map.addLayer(selectedRegionLayer)

        this.map.on('pointermove', evt => {
            if (this.map && !evt.dragging) {
                this.map.getTargetElement().style.cursor = this.map.hasFeatureAtPixel(this.map.getEventPixel(evt.originalEvent)) ? 'pointer' : ''
            }
        })

        this.map.on('click', (evt) => {
            if (this.clusterLayer && this.clusterLayer.isVisible()) {
                this.zoomToCluster(evt.pixel)
            } else {
                this.selectRegions(evt.pixel)
            }
        })
    }

    highlightAoI(data: object): VectorLayer<Feature<Geometry>> {
        this.removeComputeLayers()

        const features = new GeoJSON().readFeatures(data, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        })

        const geojsonLayerSource = new VectorSource({
            features: features
        })

        this.focusedLayer = new VectorLayer({
            source: geojsonLayerSource
        })

        this.focusedLayer.setStyle(() => {
            return new Style({
                stroke: new Stroke({
                    color: '#008080',
                    width: 3
                })
            })
        })

        this.map?.addLayer(this.focusedLayer)
        return this.focusedLayer
    }

    addGeoJsonLayer(data: object): VectorLayer<Feature<Geometry>> {
        const features = new GeoJSON().readFeatures(data, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        })

        const geojsonLayerSource = new VectorSource({
            features: features
        })

        const geojsonLayer = new VectorLayer({
            source: geojsonLayerSource,
            style: this.styleFunction.bind(this) as StyleFunction
        })

        this.map?.addLayer(geojsonLayer)
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

    async addGeoTiffLayer(blob: Blob) {
        const geoTiffSource = new GeoTIFF({
            sources: [
                {
                    blob: blob,
                    // The following options are due to https://github.com/openlayers/openlayers/issues/15894
                    bands: [1, 2, 3],
                    nodata: 0
                }
            ],
            convertToRGB: true,
            interpolate: false
        })

        await geoTiffSource.getView()

        const geoTiffLayer = new TileLayer({
            source: geoTiffSource
        })

        this.map?.addLayer(geoTiffLayer)
        return geoTiffLayer
    }
    
    removeComputeLayers(): void {
        if (this.regionLayer) {
            this.regionLayer.setVisible(false)
        }
        if (this.clusterLayer) {
            this.clusterLayer.setVisible(false)
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
            
            if (this.clusterLayer) {
                this.clusterLayer.setVisible(true)
            }
        }
    }

    getClusterStyle(clusterFeature: FeatureLike) {
        const size: number = clusterFeature.get('features').length
        let style = this.styleCache[size]
        if (!style) {
            style = new Style({
                image: new CircleStyle({
                    radius: 15,
                    stroke: new Stroke({color: 'rgba(0, 0, 0, 0.7)', width: 2}),
                    fill: new Fill({color: 'rgba(0, 0, 0, 0.5)'})
                }),
                text: new Text({
                    text: size.toString(),
                    font: 'bold 14px sans-serif',
                    textAlign: 'center',
                    textBaseline: 'middle',
                    fill: new Fill({
                        color: '#fff'
                    })
                })
            })
            this.styleCache[size] = style
        }
        return style
    }

    zoomToCluster(pixel: Array<number>) {
        if (this.clusterLayer) {
            this.clusterLayer.getFeatures(pixel).then((clickedFeatures) => {
                if (clickedFeatures.length) {
                    const extent = createEmpty()
                    const features: Feature[] = clickedFeatures[0].get('features')
                    features.forEach(f => {
                        const geometry = f.getGeometry()
                        if (geometry) {
                            extend(extent, geometry.getExtent())
                        }
                    })
                    if (this.map) {
                        this.map.getView().fit(extent, {duration: 1000, padding: [100, 100, 100, 100], easing: easeIn})
                    }
                }
            })
        }
    }

    selectRegions(pixel: Array<number>) {
        if (this.regionLayer) {
            this.regionLayer.getFeatures(pixel).then((features) => {
                if (features && features[0]) {
                    this.highlightedFeatures.clear()
                    this.highlightedFeatures.push(features[0] as Feature<Geometry>)
                }
            })
        }
    }

    getSelectedRegion(): GeoJSONFeatureCollection {
        const feature = this.highlightedFeatures.item(0)
        if (feature) {
            if (!feature.get('id')) {
                feature.set('id', Math.random().toString(36).substring(2, 9))
            }
            if (!feature.get('name')) {
                feature.set('name', 'Unnamed Region')
            }
            return new GeoJSON().writeFeatureObject(feature, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
                decimals: 7
            })
        }
    }
}