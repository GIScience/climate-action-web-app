export interface GeoJSONVTFeature {
    type?: number
    // Allow for 'any' since GeoJSONVTFeature's type defs clash with those of OL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geometry?: any
    tags?: Record<string, unknown>
    id?: string
}

export const replacer = function (_key: string, value: GeoJSONVTFeature) {
    if (!value || !value.geometry) {
        return value
    }

    let type
    const rawType = value.type
    let geometry = value.geometry
    switch (rawType) {
        case 1:
            type = 'MultiPoint'
            if (geometry.length == 1) {
                type = 'Point'
                geometry = geometry[0]
            }
            break

        case 2:
            type = 'MultiLineString'
            if (geometry.length == 1) {
                type = 'LineString'
                geometry = geometry[0]
            }
            break

        case 3:
            type = 'Polygon'
            if (geometry.length > 1) {
                type = 'MultiPolygon'
                geometry = [geometry]
            }
            break

        default:
            console.error(`Unknown geometry type: ${rawType}`)
            type = 'None'
            break
    }

    return {
        type: 'Feature',
        geometry: { type: type, coordinates: geometry },
        properties: value.tags,
        id: value.id
    }
}
