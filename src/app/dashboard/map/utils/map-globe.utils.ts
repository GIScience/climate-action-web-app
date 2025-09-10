import { Map } from 'maplibre-gl'

export interface CountryCoordinate {
    country: string
    alpha2: string
    alpha3: string
    numeric: number
    latitude: number
    longitude: number
}

export interface CountryCoordinatesResponse {
    ref_country_codes: CountryCoordinate[]
}

export class MapGlobeUtils {
    private static readonly SECONDS_PER_REVOLUTION = 240
    private static readonly MAX_SPIN_ZOOM = 5

    private static spinAnimation: number | undefined
    private static lastTime = 0

    static setupGlobeProjection(map: Map): void {
        const mapWithProjection = map as Map & { setProjection?: (projection: { type: string }) => void }
        if (mapWithProjection?.setProjection) {
            mapWithProjection.setProjection({ type: 'globe' })
        }
    }

    static startSpinning(map: Map, isOnLanding: boolean): void {
        if (!map || !isOnLanding || this.spinAnimation) return

        this.lastTime = 0

        const spinGlobe = (timestamp: number) => {
            if (!this.lastTime) this.lastTime = timestamp
            const deltaTime = (timestamp - this.lastTime) / 1000
            this.lastTime = timestamp

            const zoom = map.getZoom()
            if (this.spinAnimation && zoom < this.MAX_SPIN_ZOOM && isOnLanding) {
                const distancePerSecond = 360 / this.SECONDS_PER_REVOLUTION
                const center = map.getCenter()
                center.lng -= distancePerSecond * deltaTime
                map.setCenter(center)
                this.spinAnimation = requestAnimationFrame(spinGlobe)
            } else {
                this.spinAnimation = undefined
            }
        }

        this.spinAnimation = requestAnimationFrame(spinGlobe)
    }

    static stopSpinning(): void {
        if (this.spinAnimation) {
            cancelAnimationFrame(this.spinAnimation)
            this.spinAnimation = undefined
        }
    }

    static isSpinning(): boolean {
        return this.spinAnimation !== undefined
    }

    static resetToGlobalView(map: Map): void {
        if (!map) return

        map.flyTo({
            center: [0, 0],
            zoom: 3,
            padding: { top: 0, bottom: 0, left: 0, right: 0 },
            duration: 2000,
            essential: true
        })
    }

    static setupInteractionHandlers(map: Map): void {
        if (!map) return

        map.on('mousedown', () => this.stopSpinning())
        map.on('touchstart', () => this.stopSpinning())
        map.on('wheel', () => this.stopSpinning())
    }
}
