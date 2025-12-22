import { Injectable } from '@angular/core'
import mask from '@turf/mask'
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

        let fowFeature: GeoJSONFeature
        if (polygons.length === 1) {
            fowFeature = mask(polygons[0])
        } else {
            // Collect holes with deduplication and ensure clockwise orientation
            const seen = new Set<string>()
            const holes = polygons.flatMap(f => {
                const rings =
                    f.geometry.type === 'MultiPolygon'
                        ? f.geometry.coordinates.map(p => p[0])
                        : [f.geometry.coordinates[0]]

                return rings
                    .filter(ring => {
                        const key = ring.map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`).join('|')
                        if (seen.has(key)) return false
                        seen.add(key)
                        return true
                    })
                    .map(ring => this.ensureClockwise(ring))
            })

            fowFeature = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [-180, -90],
                            [180, -90],
                            [180, 90],
                            [-180, 90],
                            [-180, -90]
                        ],
                        ...holes
                    ]
                },
                properties: {}
            }
        }

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

        this.map.moveLayer(this.LAYER_ID)
    }

    private ensureClockwise(ring: Position[]): Position[] {
        let area = 0
        for (let i = 0; i < ring.length - 1; i++) {
            area += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1])
        }
        return area > 0 ? ring : [...ring].reverse()
    }
}
