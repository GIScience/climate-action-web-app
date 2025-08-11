import { Injectable } from '@angular/core'
import area from '@turf/area'
import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw'
import { Feature as GeoJSONFeature } from 'geojson'
import { IControl, LngLatLike, Map, Popup } from 'maplibre-gl'
import Feature from 'ol/Feature'
import { Geometry } from 'ol/geom'
import { BehaviorSubject, Observable } from 'rxjs'
import { MapConvertMeasureUtils } from './utils/map-convert-measure.utils'

export interface DrawingFeature {
    geoJsonFeature: GeoJSONFeature
    olFeature: Feature<Geometry>
}

export type DrawMode = 'polygon' | 'circle' | 'rectangle' | null

@Injectable({
    providedIn: 'root'
})
export class MapDrawingService {
    private readonly SQM_TO_SQKM_FACTOR = 1e-6
    private readonly DRAW_MODES = { Polygon: 'polygon', Circle: 'circle', Box: 'rectangle' } as const
    private readonly TYPE_MAP = { circle: 'Circle', rectangle: 'Box', polygon: 'Polygon' } as const

    private terraDrawControl: MaplibreTerradrawControl | undefined
    private map: Map | undefined

    private currentDrawMode = new BehaviorSubject<DrawMode>(null)
    private isDrawingMode = new BehaviorSubject<boolean>(false)
    private drawnFeatures = new BehaviorSubject<DrawingFeature[]>([])

    private measureTooltipElement: HTMLElement | undefined
    private measureTooltip: Popup | undefined

    get currentDrawMode$(): Observable<DrawMode> {
        return this.currentDrawMode.asObservable()
    }

    get isDrawingMode$(): Observable<boolean> {
        return this.isDrawingMode.asObservable()
    }

    get drawnFeatures$(): Observable<DrawingFeature[]> {
        return this.drawnFeatures.asObservable()
    }

    get currentDrawModeValue(): DrawMode {
        return this.currentDrawMode.value
    }

    get isDrawingModeValue(): boolean {
        return this.isDrawingMode.value
    }

    get drawnFeaturesValue(): DrawingFeature[] {
        return this.drawnFeatures.value
    }

    initializeTerraDraw(map: Map): MaplibreTerradrawControl {
        this.map = map
        this.terraDrawControl = new MaplibreTerradrawControl({
            modes: ['polygon', 'circle', 'rectangle', 'select', 'render'],
            open: false
        })

        map.addControl(this.terraDrawControl as IControl, 'top-left')

        setTimeout(() => {
            const terraDraw = this.terraDrawControl?.getTerraDrawInstance()
            if (!terraDraw) return

            terraDraw.setMode('static')
            terraDraw.on('finish', (featureId: string | number) => this.handleDrawFinish(featureId))
            terraDraw.on('change', () => this.updateMeasurements())
        }, 100)

        return this.terraDrawControl
    }

    startDrawing(type: 'Polygon' | 'Circle' | 'Box'): void {
        this.clearDrawnFeatures()

        const terraDraw = this.terraDrawControl?.getTerraDrawInstance()
        if (!terraDraw) return

        const mode = this.DRAW_MODES[type]
        terraDraw.setMode(mode)
        this.currentDrawMode.next(mode)
        this.isDrawingMode.next(true)
    }

    stopDrawing(): void {
        this.terraDrawControl?.getTerraDrawInstance()?.setMode('static')

        this.measureTooltip?.remove()
        this.measureTooltip = undefined
        this.measureTooltipElement = undefined

        this.currentDrawMode.next(null)
        this.isDrawingMode.next(false)
    }

    clearDrawnFeatures(): void {
        const terraDraw = this.terraDrawControl?.getTerraDrawInstance()
        if (terraDraw) {
            const featureIds = terraDraw
                .getSnapshot()
                .map(f => f.id)
                .filter(Boolean) as string[]
            if (featureIds.length) terraDraw.removeFeatures(featureIds)
        }

        this.drawnFeatures.next([])
    }

    private handleDrawFinish(featureId: string | number): void {
        const terraDraw = this.terraDrawControl?.getTerraDrawInstance()
        const currentMode = this.currentDrawMode.value
        if (!terraDraw || !currentMode) return

        const drawnFeature = terraDraw.getSnapshot().find(f => f.id === featureId)
        if (!drawnFeature || drawnFeature.geometry.type !== 'Polygon') return

        const geometry = { type: 'MultiPolygon' as const, coordinates: [drawnFeature.geometry.coordinates] }
        const properties = {
            name: 'Custom Area',
            original_type: this.TYPE_MAP[currentMode],
            id: featureId,
            area: Number((area({ type: 'Feature', geometry, properties: {} }) * this.SQM_TO_SQKM_FACTOR).toFixed(2))
        }

        const mercatorCoords = geometry.coordinates
            .flat(2)
            .map(([lng, lat]) => MapConvertMeasureUtils.lngLatToMercator(lng, lat))
        const extent = [
            Math.min(...mercatorCoords.map(c => c[0])),
            Math.min(...mercatorCoords.map(c => c[1])),
            Math.max(...mercatorCoords.map(c => c[0])),
            Math.max(...mercatorCoords.map(c => c[1]))
        ]

        const olFeature = {
            get: (key: string) => properties[key as keyof typeof properties],
            set: () => {},
            getGeometry: () => ({
                getType: () => 'MultiPolygon',
                getCoordinates: () =>
                    geometry.coordinates.map(p =>
                        p.map(r => r.map(([lng, lat]) => MapConvertMeasureUtils.lngLatToMercator(lng, lat)))
                    ),
                getExtent: () => extent
            }),
            getProperties: () => properties
        } as unknown as Feature<Geometry>

        const geoJsonFeature: GeoJSONFeature = {
            type: 'Feature',
            geometry: geometry,
            properties: properties
        }

        const currentFeatures = this.drawnFeatures.value
        this.drawnFeatures.next([...currentFeatures, { geoJsonFeature, olFeature }])

        terraDraw.setMode('static')
        this.stopDrawing()
    }

    private updateMeasurements(): void {
        if (!this.map) return

        const feature = this.terraDrawControl?.getTerraDrawInstance()?.getSnapshot().at(-1)
        const coords = feature?.geometry.type === 'Polygon' ? feature.geometry.coordinates[0] : undefined

        if (
            !this.isDrawingMode.value ||
            this.currentDrawMode.value !== 'circle' ||
            !coords?.length ||
            coords.length < 2
        ) {
            this.measureTooltip?.remove()
            this.measureTooltip = undefined
            this.measureTooltipElement = undefined
            return
        }

        const bounds = coords.reduce(
            (acc, [lng, lat]) => [
                Math.min(acc[0], lng),
                Math.max(acc[1], lng),
                Math.min(acc[2], lat),
                Math.max(acc[3], lat)
            ],
            [coords[0][0], coords[0][0], coords[0][1], coords[0][1]]
        )
        const center: [number, number] = [(bounds[0] + bounds[1]) / 2, (bounds[2] + bounds[3]) / 2]
        const radius = MapConvertMeasureUtils.calculateDistance(center, coords[0])
        const radiusText = `Radius: ${MapConvertMeasureUtils.formatRadius(radius)}`

        if (this.measureTooltip && this.measureTooltipElement) {
            this.measureTooltipElement.textContent = radiusText
            this.measureTooltip.setLngLat(coords[0] as LngLatLike)
            if (!this.measureTooltip.isOpen()) this.measureTooltip.addTo(this.map)
            return
        }

        this.measureTooltipElement = document.createElement('div')
        this.measureTooltipElement.style.cssText =
            'padding:4px 8px;background:rgba(0,0,0,0.8);color:white;font-size:12px;border-radius:3px;'
        this.measureTooltipElement.textContent = radiusText

        this.measureTooltip = new Popup({ closeButton: false, closeOnClick: false, offset: [0, -15] })
            .setLngLat(coords[0] as LngLatLike)
            .setDOMContent(this.measureTooltipElement)
            .addTo(this.map)
    }
}
