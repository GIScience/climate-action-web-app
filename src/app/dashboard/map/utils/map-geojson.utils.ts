import { GeoJSONSource, LayerSpecification, Map, Popup } from 'maplibre-gl'

export class MapGeoJsonUtils {
    private static readonly HIGHLIGHT_COLOR = 'rgba(255, 255, 255, 0.8)'

    static setupGeoJsonInteractions(
        map: Map,
        layerId: string,
        artifactName: string,
        featureHoverOverlay: Popup | undefined,
        onHoverOverlayChange: (overlay: Popup | undefined) => void
    ) {
        if (!map) return
        const layerIds = [`${layerId}-fill`, `${layerId}-outline`, `${layerId}-line`, `${layerId}-point`]

        if (!map.getSource('hover-highlight')) {
            map.addSource('hover-highlight', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        }

        const highlightLayers = [
            {
                id: 'hover-highlight-fill',
                type: 'line',
                paint: { 'line-color': this.HIGHLIGHT_COLOR, 'line-width': 3, 'line-blur': 2 },
                filter: ['==', '$type', 'Polygon']
            },
            {
                id: 'hover-highlight-line',
                type: 'line',
                paint: {
                    'line-color': this.HIGHLIGHT_COLOR,
                    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 8, 12, 10, 14, 12, 16, 14, 18, 16],
                    'line-blur': 3,
                    'line-opacity': 0.8
                },
                filter: ['==', '$type', 'LineString']
            },
            {
                id: 'hover-highlight-point',
                type: 'circle',
                paint: {
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 12, 14, 14, 16, 16, 20, 18, 24],
                    'circle-color': 'rgba(255, 255, 255, 0)',
                    'circle-stroke-width': 4,
                    'circle-stroke-color': this.HIGHLIGHT_COLOR,
                    'circle-blur': 2
                },
                filter: ['==', '$type', 'Point']
            }
        ]

        highlightLayers.forEach(layer => {
            if (!map.getLayer(layer.id)) {
                map.addLayer({ ...layer, source: 'hover-highlight' } as LayerSpecification)
            }
        })

        let hoverFeatureId: string | number | undefined
        let popupTimeout: number | undefined

        map.on('mousemove', e => {
            const buffer = Math.min(25, Math.max(5, 3 * Math.pow(1.15, map.getZoom() - 10)))
            const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
                [e.point.x - buffer, e.point.y - buffer],
                [e.point.x + buffer, e.point.y + buffer]
            ]
            const existingLayers = layerIds.filter(id => map.getLayer(id))
            if (!existingLayers.length) return
            const features = map.queryRenderedFeatures(bbox, { layers: existingLayers })
            const feature = features?.[0]
            const featureId = feature?.id ?? feature?.properties?.['index']
            if (hoverFeatureId === featureId) return
            hoverFeatureId = featureId
            const highlightSource = map.getSource('hover-highlight') as GeoJSONSource
            map.getCanvas().style.cursor = feature ? 'pointer' : ''
            highlightSource?.setData({ type: 'FeatureCollection', features: feature ? [feature] : [] })

            if (popupTimeout) {
                clearTimeout(popupTimeout)
                popupTimeout = undefined
            }

            if (feature) {
                popupTimeout = window.setTimeout(() => {
                    if (!featureHoverOverlay) {
                        onHoverOverlayChange(
                            (featureHoverOverlay = new Popup({
                                closeButton: false,
                                closeOnClick: false,
                                offset: 15,
                                className: 'smooth-popup'
                            }))
                        )
                    }
                    featureHoverOverlay
                        .setLngLat(e.lngLat)
                        .setHTML(
                            `<strong>${artifactName}</strong>: ${feature.properties?.['label'] || feature.properties?.['name'] || 'Feature'}`
                        )
                        .addTo(map)
                }, 100)
            } else {
                featureHoverOverlay?.remove()
            }
        })
    }

    static cleanupGeoJsonInteractions(map: Map) {
        const highlightLayerIds = ['hover-highlight-fill', 'hover-highlight-line', 'hover-highlight-point']
        highlightLayerIds.forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId)
            }
        })

        if (map.getSource('hover-highlight')) {
            map.removeSource('hover-highlight')
        }
    }
}
