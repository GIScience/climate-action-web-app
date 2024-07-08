export interface DiscreteLegendData {
    [key: string]: string
}

export interface TicksObject {
    [key: string]: number
}

export interface ContinuousLegendData {
    cmap_name: string
    ticks: TicksObject
}

export interface LegendObject {
    legend_type: 'CONTINUOUS' | 'DISCRETE'
    legend_data: ContinuousLegendData | DiscreteLegendData
}

export interface AttachmentsObject {
    LEGEND?: LegendObject
}

export interface ArtifactNode {
    name: string
    uuid: string
    children: ArtifactNode[]
    timestamp?: string
    icon?: string
    summary?: string
    status?: string
    ref?: Artifact
    isExpanded?: boolean
    keepInDOM?: boolean
    showSecondaryChildren?: boolean
}

export interface Artifact {
    name: string
    modality: 'IMAGE' | 'MARKDOWN' | 'CHART' | 'TABLE' | 'MAP_LAYER_GEOJSON' | 'MAP_LAYER_GEOTIFF'
    file_path: string
    summary: string
    description: string
    correlation_uuid: string
    params: object
    store_id: string
    primary: boolean
    attachments: AttachmentsObject
}

export interface ChartData {
    chart_type: string
    color: string | string[]
    x: string[] | number[]
    y: number[]
}

export interface ActiveArtifactRef {
    correlation_uuid: string
    store_uuid: string
}

export interface ArtifactData {
    url: string
    artifact: Artifact
}