import { Injectable } from '@angular/core'
import mask from '@turf/mask'
import type { Feature as GeoJSONFeature, MultiPolygon, Polygon, Position } from 'geojson'
import type { GeoJSONSource, Map as MaplibreMap } from 'maplibre-gl'
import { union as polyclipUnion } from 'polyclip-ts'

type PolyclipRing = [number, number][]
type PolyclipPolygon = PolyclipRing[]

export type FoWGeometryType = 'focused' | 'pinned'

interface FoWGeometry {
    geometry: GeoJSONFeature
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

    private geometriesByMap = new WeakMap<MaplibreMap, Map<string, FoWGeometry>>()
    private primaryMap?: MaplibreMap

    setMap(map: MaplibreMap, isPrimary: boolean = false): void {
        if (isPrimary) {
            this.primaryMap = map
        }
        if (!this.geometriesByMap.has(map)) {
            this.geometriesByMap.set(map, new Map())
        }
        map.on('style.load', () => this.updateMapLayers(map))

        if (map.isStyleLoaded()) {
            this.updateMapLayers(map)
        }
    }

    restorePrimaryMap(): void {
        if (this.primaryMap) {
            this.updateMapLayers(this.primaryMap)
        }
    }

    addGeometry(map: MaplibreMap, id: string, geometry: GeoJSONFeature, type: FoWGeometryType): void {
        this.getGeometries(map).set(id, { geometry, type })
        this.updateMapLayers(map)
    }

    clearByType(map: MaplibreMap, type: FoWGeometryType): void {
        const geometries = this.getGeometries(map)
        let changed = false
        for (const [id, geom] of geometries) {
            if (geom.type === type) {
                geometries.delete(id)
                changed = true
            }
        }
        if (changed) this.updateMapLayers(map)
    }

    private getGeometries(map: MaplibreMap): Map<string, FoWGeometry> {
        let geometries = this.geometriesByMap.get(map)
        if (!geometries) {
            geometries = new Map<string, FoWGeometry>()
            this.geometriesByMap.set(map, geometries)
        }
        return geometries
    }

    private updateMapLayers(map: MaplibreMap): void {
        const geometries = this.getGeometries(map)

        if (geometries.size === 0) {
            if (map.getLayer(this.LAYER_ID)) map.removeLayer(this.LAYER_ID)
            if (map.getSource(this.SOURCE_ID)) map.removeSource(this.SOURCE_ID)
            if (map.getLayer(this.OUTLINE_LAYER_ID)) map.removeLayer(this.OUTLINE_LAYER_ID)
            if (map.getSource(this.OUTLINE_SOURCE_ID)) map.removeSource(this.OUTLINE_SOURCE_ID)
            return
        }

        const polygons: GeoJSONFeature<Polygon | MultiPolygon>[] = []

        for (const { geometry: feat } of geometries.values()) {
            if (feat?.geometry?.type === 'Polygon' || feat?.geometry?.type === 'MultiPolygon') {
                polygons.push(feat as GeoJSONFeature<Polygon | MultiPolygon>)
            }
        }

        if (polygons.length === 0) return

        // Extract polygon coordinates for polyclip-ts
        const polyclipPolygons: PolyclipPolygon[] = polygons.flatMap(feature => {
            if (feature.geometry.type === 'Polygon') {
                return [feature.geometry.coordinates as PolyclipPolygon]
            } else {
                return feature.geometry.coordinates as PolyclipPolygon[]
            }
        })

        // Union all polygons - polyclip detects enclosed regions and creates holes
        const unionResult = polyclipUnion(polyclipPolygons[0], ...polyclipPolygons.slice(1))

        // Separate outer rings and holes from the union result
        const outerRings: Position[][] = []
        const holeRings: Position[][] = []

        for (const polygon of unionResult) {
            if (polygon.length > 0) {
                outerRings.push(polygon[0] as Position[])
                for (let i = 1; i < polygon.length; i++) {
                    holeRings.push(polygon[i] as Position[])
                }
            }
        }

        // Create the base mask from outer rings only
        const outerOnlyFeature: GeoJSONFeature<MultiPolygon> = {
            type: 'Feature',
            geometry: { type: 'MultiPolygon', coordinates: outerRings.map(r => [r]) },
            properties: {}
        }

        let fowFeature: GeoJSONFeature<Polygon | MultiPolygon> = mask(outerOnlyFeature)

        // Add holes back as fog areas by unioning them with the mask
        if (holeRings.length > 0) {
            const holePolygons: PolyclipPolygon[] = holeRings.map(ring => [ring] as PolyclipPolygon)
            const maskPolygons: PolyclipPolygon[] =
                fowFeature.geometry.type === 'Polygon'
                    ? [fowFeature.geometry.coordinates as PolyclipPolygon]
                    : (fowFeature.geometry.coordinates as PolyclipPolygon[])
            const allPolygons = [...maskPolygons, ...holePolygons]
            const fogUnion = polyclipUnion(allPolygons[0], ...allPolygons.slice(1))
            fowFeature = {
                type: 'Feature',
                geometry: { type: 'MultiPolygon', coordinates: fogUnion as Position[][][] },
                properties: {}
            }
        }

        const source = map.getSource(this.SOURCE_ID) as GeoJSONSource | undefined
        if (source) {
            source.setData(fowFeature)
        } else {
            map.addSource(this.SOURCE_ID, { type: 'geojson', data: fowFeature })
        }

        if (!map.getLayer(this.LAYER_ID)) {
            map.addLayer({
                id: this.LAYER_ID,
                type: 'fill',
                source: this.SOURCE_ID,
                paint: {
                    'fill-color': 'rgba(51, 51, 51, 0.35)'
                }
            })
        }

        // Add outline layer for artifact boundaries
        const outlineData: GeoJSONFeature<MultiPolygon> = {
            type: 'Feature',
            geometry: {
                type: 'MultiPolygon',
                coordinates: polygons.flatMap(p =>
                    p.geometry.type === 'MultiPolygon' ? p.geometry.coordinates : [p.geometry.coordinates]
                )
            },
            properties: {}
        }

        const outlineSource = map.getSource(this.OUTLINE_SOURCE_ID) as GeoJSONSource | undefined
        if (outlineSource) {
            outlineSource.setData(outlineData)
        } else {
            map.addSource(this.OUTLINE_SOURCE_ID, { type: 'geojson', data: outlineData })
        }

        if (!map.getLayer(this.OUTLINE_LAYER_ID)) {
            map.addLayer({
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

        map.moveLayer(this.LAYER_ID)
        map.moveLayer(this.OUTLINE_LAYER_ID)
    }
}
