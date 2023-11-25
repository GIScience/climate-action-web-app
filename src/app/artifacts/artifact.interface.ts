export interface Artifact {
    name: string,
    modality: "IMAGE" | "MARKDOWN" | "CHART" | "TABLE" | "MAP_LAYER_GEOJSON" | "MAP_LAYER_GEOTIFF",
    file_path: string,
    summary: string,
    description: string,
    correlation_uuid: string,
    params: object,
    store_id: string,
    icon?: "ti-image" | "ti-align-left" | "ti-stats-up" | "ti-layout-grid3" | "ti-map-alt" | "ti-file"
}

export interface ChartResponse {
    chart_type: string,
    color: string[],
    x: string[],
    y: number[]
}
