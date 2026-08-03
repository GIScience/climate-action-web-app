import type { Feature, GeoJSON } from 'geojson'
import { GeoJSONSource, Map as MaplibreMap, MapMouseEvent, PointLike, Popup, type MapGeoJSONFeature } from 'maplibre-gl'

interface HoverContext {
    layers: Map<string, string>
    displayNameGetters?: Map<string, () => string>
    popup?: Popup
    hoverId?: string | number
    timeout?: number
    onPopupChange?: (popup: Popup | undefined) => void
    handlers?: { move: (e: MapMouseEvent) => void; style: () => void }
}

const HIGHLIGHT = 'rgba(255, 255, 255, 0.8)'
const SOURCE_ID = 'hover-highlight'
const LAYER_SUFFIXES = ['-fill', '-outline', '-line', '-point']
const LAYER_IDS = ['hover-highlight-fill', 'hover-highlight-line', 'hover-highlight-point']

export class MapGeoJsonUtils {
    private static contexts = new Map<MaplibreMap, HoverContext>()

    static setupGeoJsonInteractions(
        map: MaplibreMap,
        layerId: string,
        artifactName: string,
        popup: Popup | undefined,
        onPopupChange: (popup: Popup | undefined) => void,
        getDisplayName?: () => string
    ): void {
        if (!map) return

        let ctx = this.contexts.get(map)
        if (!ctx) {
            ctx = { layers: new Map(), displayNameGetters: new Map(), onPopupChange }
            this.contexts.set(map, ctx)
        }
        ctx.onPopupChange = onPopupChange
        ctx.layers.set(layerId, artifactName)
        if (getDisplayName) {
            if (!ctx.displayNameGetters) ctx.displayNameGetters = new Map()
            ctx.displayNameGetters.set(layerId, getDisplayName)
        }
        if (!ctx.popup && popup) ctx.popup = popup

        this.ensureLayers(map)

        if (!ctx.handlers) {
            const style = () => this.ensureLayers(map)
            const move = (e: MapMouseEvent) => this.handleMouseMove(map, ctx!, e)
            ctx.handlers = { move, style }
            map.on('style.load', style)
            map.on('mousemove', move)
        }
    }

    static cleanupGeoJsonInteractions(map: MaplibreMap, layerId?: string): boolean {
        const ctx = this.contexts.get(map)
        if (!ctx) return false

        if (layerId) {
            ctx.layers.delete(layerId)
            ctx.displayNameGetters?.delete(layerId)
        }
        if (ctx.layers.size > 0) return true

        this.clearHover(map, ctx)
        if (ctx.handlers) {
            map.off('mousemove', ctx.handlers.move)
            map.off('style.load', ctx.handlers.style)
        }
        this.removeLayers(map)
        this.contexts.delete(map)
        return false
    }

    private static handleMouseMove(map: MaplibreMap, ctx: HoverContext, e: MapMouseEvent): void {
        const buffer = Math.min(25, Math.max(5, 3 * Math.pow(1.15, map.getZoom() - 10)))
        const bbox: [PointLike, PointLike] = [
            [e.point.x - buffer, e.point.y - buffer],
            [e.point.x + buffer, e.point.y + buffer]
        ]

        const layerIds: string[] = []
        const layerMap = new Map<string, { name: string; baseId: string }>()

        for (const [baseId, name] of ctx.layers) {
            for (const suffix of LAYER_SUFFIXES) {
                const id = baseId + suffix
                if (map.getLayer(id)) {
                    layerIds.push(id)
                    layerMap.set(id, { name, baseId })
                }
            }
        }

        if (!layerIds.length) {
            this.clearHover(map, ctx)
            return
        }

        const features = map.queryRenderedFeatures(bbox, { layers: layerIds }) as MapGeoJSONFeature[]
        if (!features.length) {
            this.clearHover(map, ctx)
            return
        }

        const first = features[0]
        const id = first?.id ?? first?.properties?.['index']

        if (ctx.hoverId !== id) {
            ctx.hoverId = id
            map.getCanvas().style.cursor = 'pointer'
            const source = map.getSource(SOURCE_ID) as GeoJSONSource
            const json = JSON.parse(JSON.stringify(typeof first.toJSON === 'function' ? first.toJSON() : first))
            source?.setData({ type: 'FeatureCollection', features: [json] })
        }

        if (ctx.timeout) clearTimeout(ctx.timeout)

        ctx.timeout = window.setTimeout(() => {
            if (!ctx.popup) {
                ctx.popup = new Popup({
                    closeButton: false,
                    closeOnClick: false,
                    offset: 15,
                    className: 'smooth-popup'
                })
                ctx.onPopupChange?.(ctx.popup)
            }

            const seen = new Set<string>()
            const html = features
                .map(f => {
                    const layerInfo = layerMap.get(f.layer.id)
                    const baseLayerId = LAYER_SUFFIXES.reduce(
                        (id, suffix) => (id.endsWith(suffix) ? id.slice(0, -suffix.length) : id),
                        f.layer.id
                    )
                    if (!layerInfo || seen.has(baseLayerId)) return null
                    seen.add(baseLayerId)
                    const displayNameGetter = ctx.displayNameGetters?.get(layerInfo.baseId)
                    const displayName = displayNameGetter ? displayNameGetter() : layerInfo.name
                    const label = f.properties?.['label'] ?? f.properties?.['name'] ?? 'Feature'
                    return `<strong>${displayName}</strong>: ${label}`
                })
                .filter(Boolean)
                .join('<hr style="margin:8px 0;border:none;border-top:1px solid #ddd">')

            ctx.popup?.setLngLat(e.lngLat).setHTML(html).addTo(map)
        }, 100)
    }

    private static clearHover(map: MaplibreMap, ctx: HoverContext): void {
        map.getCanvas().style.cursor = ''
        ;(map.getSource(SOURCE_ID) as GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] })
        ctx.hoverId = undefined
        if (ctx.timeout) {
            clearTimeout(ctx.timeout)
            ctx.timeout = undefined
        }
        ctx.popup?.remove()
    }

    private static ensureLayers(map: MaplibreMap): void {
        if (!map.getSource(SOURCE_ID)) {
            map.addSource(SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        }

        if (!map.getLayer('hover-highlight-fill')) {
            map.addLayer({
                id: 'hover-highlight-fill',
                type: 'line',
                source: SOURCE_ID,
                paint: { 'line-color': HIGHLIGHT, 'line-width': 3, 'line-blur': 2 },
                filter: ['==', '$type', 'Polygon']
            })
        }
        if (!map.getLayer('hover-highlight-line')) {
            map.addLayer({
                id: 'hover-highlight-line',
                type: 'line',
                source: SOURCE_ID,
                paint: {
                    'line-color': HIGHLIGHT,
                    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 8, 12, 10, 14, 12, 16, 14, 18, 16],
                    'line-blur': 3,
                    'line-opacity': 0.8
                },
                filter: ['==', '$type', 'LineString']
            })
        }
        if (!map.getLayer('hover-highlight-point')) {
            map.addLayer({
                id: 'hover-highlight-point',
                type: 'circle',
                source: SOURCE_ID,
                paint: {
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 12, 14, 14, 16, 16, 20, 18, 24],
                    'circle-color': 'rgba(255, 255, 255, 0)',
                    'circle-stroke-width': 4,
                    'circle-stroke-color': HIGHLIGHT,
                    'circle-blur': 2
                },
                filter: ['==', '$type', 'Point']
            })
        }
    }

    private static removeLayers(map: MaplibreMap): void {
        LAYER_IDS.forEach(id => map.getLayer(id) && map.removeLayer(id))
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
    static extractFeature(object: GeoJSON): Feature {
        switch (object.type) {
            case 'Feature':
                return object
            case 'FeatureCollection':
                return object.features[0]
            default:
                return {
                    type: 'Feature',
                    geometry: object,
                    properties: {}
                }
        }
    }
}
