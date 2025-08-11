import { Geometry, Position } from 'geojson'

type DeepPosition = Position | DeepPosition[]

export class MapConvertMeasureUtils {
    private static readonly MERCATOR_LIMIT = 20037508.34
    private static readonly EARTH_RADIUS_METERS = 6371000

    static mercatorToWgs84(x: number, y: number): [number, number] {
        return [
            (x * 180) / this.MERCATOR_LIMIT,
            (Math.atan(Math.exp((y * Math.PI) / this.MERCATOR_LIMIT)) * 360) / Math.PI - 90
        ]
    }

    static lngLatToMercator(lng: number, lat: number): [number, number] {
        return [
            (lng * this.MERCATOR_LIMIT) / 180,
            (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * this.MERCATOR_LIMIT) / Math.PI
        ]
    }

    static transformExtentToWgs84(extent: number[]): number[] {
        return extent.length !== 4
            ? extent
            : [...this.mercatorToWgs84(extent[0], extent[1]), ...this.mercatorToWgs84(extent[2], extent[3])]
    }

    static transformGeometryToWgs84<T extends Geometry>(geometry: T): T {
        if (!geometry || !('coordinates' in geometry)) return geometry
        const transform = (coords: DeepPosition): DeepPosition =>
            typeof coords[0] === 'number' && typeof coords[1] === 'number'
                ? this.mercatorToWgs84(coords[0], coords[1])
                : (coords as DeepPosition[]).map(transform)
        return { ...geometry, coordinates: transform(geometry.coordinates as DeepPosition) }
    }

    static calculateDistance([lng1, lat1]: number[], [lng2, lat2]: number[]): number {
        const toRad = (deg: number) => (deg * Math.PI) / 180
        const [dLat, dLng] = [toRad(lat2 - lat1), toRad(lng2 - lng1)]
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
        return this.EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    static formatRadius = (radius: number) =>
        radius >= 1000 ? `${(radius / 1000).toFixed(2)} km` : `${radius.toFixed(0)} m`
}
