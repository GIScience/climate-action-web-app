import { Injectable } from '@angular/core'
import mask from '@turf/mask'
import union from '@turf/union'
import type { Feature as GeoJSONFeature, MultiPolygon, Polygon, Position } from 'geojson'
import type { GeoJSONSource, Map as MaplibreMap } from 'maplibre-gl'
import type { Feature } from 'ol'
import type { Coordinate } from 'ol/coordinate'
import { Geometry, MultiPolygon as OLMultiPolygon, Polygon as OLPolygon } from 'ol/geom'
import { MapConvertMeasureUtils } from './utils/map-convert-measure.utils'

export type FoWGeometryType = 'focused' | 'pinned'

interface FoWGeometry {
    geometry: Feature<Geometry>
    type: FoWGeometryType
}

@Injectable({
    providedIn: 'root'
})
export class MapFoWManagerService {
    private readonly SOURCE_ID = 'fow-source'
    private readonly LAYER_ID = 'fow-layer'
    private readonly OUTLINE_SOURCE_ID = 'fow-outline-source'
    private readonly OUTLINE_LAYER_ID = 'fow-outline-layer'

    private geometries = new Map<string, FoWGeometry>()
    private map?: MaplibreMap

    setMap(map: MaplibreMap): void {
        this.map = map
        this.map.on('style.load', () => this.updateMapLayers())

        if (this.map.isStyleLoaded()) {
            this.updateMapLayers()
        }
    }

    addGeometry(id: string, geometry: Feature<Geometry>, type: FoWGeometryType): void {
        this.geometries.set(id, { geometry, type })
        this.updateMapLayers()
    }

    clearByType(type: FoWGeometryType): void {
        let changed = false
        for (const [id, geom] of this.geometries) {
            if (geom.type === type) {
                this.geometries.delete(id)
                changed = true
            }
        }
        if (changed) this.updateMapLayers()
    }

    private updateMapLayers(): void {
        if (!this.map) return

        if (this.geometries.size === 0) {
            if (this.map.getLayer(this.LAYER_ID)) this.map.removeLayer(this.LAYER_ID)
            if (this.map.getSource(this.SOURCE_ID)) this.map.removeSource(this.SOURCE_ID)
            if (this.map.getLayer(this.OUTLINE_LAYER_ID)) this.map.removeLayer(this.OUTLINE_LAYER_ID)
            if (this.map.getSource(this.OUTLINE_SOURCE_ID)) this.map.removeSource(this.OUTLINE_SOURCE_ID)
            return
        }

        const polygons: GeoJSONFeature<Polygon | MultiPolygon>[] = []

        for (const { geometry: olFeature } of this.geometries.values()) {
            const geom = olFeature?.getGeometry?.() as OLMultiPolygon | OLPolygon | null
            if (!geom) continue

            const transform = (coords: Coordinate[]) =>
                coords.map(c => MapConvertMeasureUtils.mercatorToWgs84(c[0], c[1])) as Position[]

            const coords = geom.getCoordinates()

            if (geom instanceof OLMultiPolygon) {
                polygons.push({
                    type: 'Feature',
                    geometry: {
                        type: 'MultiPolygon',
                        coordinates: (coords as Coordinate[][][]).map(p => p.map(transform))
                    },
                    properties: {}
                })
            } else {
                polygons.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: (coords as Coordinate[][]).map(transform)
                    },
                    properties: {}
                })
            }
        }

        if (polygons.length === 0) return

        const combined =
            polygons.length === 1
                ? polygons[0]
                : (union({ type: 'FeatureCollection', features: polygons }) ?? polygons[0])
        const fowFeature = mask(combined)

        const source = this.map.getSource(this.SOURCE_ID) as GeoJSONSource | undefined
        if (source) {
            source.setData(fowFeature)
        } else {
            this.map.addSource(this.SOURCE_ID, { type: 'geojson', data: fowFeature })
        }

        if (!this.map.getLayer(this.LAYER_ID)) {
            this.map.addLayer({
                id: this.LAYER_ID,
                type: 'fill',
                source: this.SOURCE_ID,
                paint: {
                    'fill-color': 'rgba(51, 51, 51, 0.35)'
                }
            })
        }

        // Add outline layer for artifact boundaries
        const outlineData: GeoJSONFeature<Polygon | MultiPolygon> = {
            type: 'Feature',
            geometry:
                polygons.length === 1
                    ? polygons[0].geometry
                    : {
                          type: 'MultiPolygon',
                          coordinates: polygons.flatMap(p =>
                              p.geometry.type === 'MultiPolygon' ? p.geometry.coordinates : [p.geometry.coordinates]
                          )
                      },
            properties: {}
        }

        const outlineSource = this.map.getSource(this.OUTLINE_SOURCE_ID) as GeoJSONSource | undefined
        if (outlineSource) {
            outlineSource.setData(outlineData)
        } else {
            this.map.addSource(this.OUTLINE_SOURCE_ID, { type: 'geojson', data: outlineData })
        }

        if (!this.map.getLayer(this.OUTLINE_LAYER_ID)) {
            this.map.addLayer({
                id: this.OUTLINE_LAYER_ID,
                type: 'line',
                source: this.OUTLINE_SOURCE_ID,
                paint: {
                    'line-color': '#666',
                    'line-width': 2,
                    'line-opacity': 0.75,
                    'line-dasharray': [4, 1]
                }
            })
        }

        this.map.moveLayer(this.LAYER_ID)
        this.map.moveLayer(this.OUTLINE_LAYER_ID)
    }
}
