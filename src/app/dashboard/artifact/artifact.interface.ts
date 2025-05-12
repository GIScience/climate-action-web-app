import { HexColor } from '@app/types/color/color.type'
import type { Data, Layout } from 'plotly.js-cartesian-dist'

export interface DiscreteLegendData {
    [key: string]: HexColor
}

export interface TicksObject {
    [key: string]: number
}

export interface ContinuousLegendData {
    cmap_name: string
    ticks: TicksObject
}

export interface LegendObject {
    title?: string
    unit?: string
    legend_type: 'CONTINUOUS' | 'DISCRETE'
    legend_data: ContinuousLegendData | DiscreteLegendData
}

export interface AttachmentsObject {
    legend?: LegendObject
}

export interface Artifact {
    name: string
    modality: 'IMAGE' | 'MARKDOWN' | 'CHART' | 'CHART_PLOTLY' | 'TABLE' | 'MAP_LAYER_GEOJSON' | 'MAP_LAYER_GEOTIFF'
    primary: boolean
    file_path: string
    summary?: string
    description?: string
    correlation_uuid: string
    store_id: string
    attachments: AttachmentsObject
    isLoading?: boolean
}

export interface ArtifactEntity extends Artifact {
    isLoading?: boolean
    icon?: string
}

export interface ChartData {
    chart_type: 'SCATTER' | 'LINE' | 'BAR' | 'PIE'
    color: HexColor | HexColor[]
    x: string[] | number[]
    y: number[]
}

export interface PlotlyChartData {
    data: Data[]
    layout: Partial<Layout>
}

export type ActiveArtifactRef = Pick<Artifact, 'correlation_uuid' | 'store_id'>

export interface ArtifactData extends Artifact {
    url: string // Contains the presigned url for the artifact
}
