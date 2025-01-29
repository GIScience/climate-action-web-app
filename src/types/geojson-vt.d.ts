declare module 'geojson-vt' {
    // Allow for 'any' since GeoJSONVTFeature's type defs clash with those of OL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geojsonvt: any
    export default geojsonvt
}
