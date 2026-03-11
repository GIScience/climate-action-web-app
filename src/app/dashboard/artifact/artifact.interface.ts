import { HexColor } from '@app/types/color/color.type'
import { Source } from '@app/types/sources/sources.type'
import type { Data, Layout } from 'plotly.js-strict-dist'

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
    legend_type: 'CONTINUOUS' | 'DISCRETE'
    legend_data: ContinuousLegendData | DiscreteLegendData
}

export interface DiscreteLegendItem {
    name: string
    displayName: string
    color: HexColor
    visible: boolean
}

export interface ContinuousLegendItem {
    displayName: string
    position: number
}

export interface AttachmentsObject {
    legend?: LegendObject
    display_filename?: string
}

export interface Artifact {
    name: string
    modality: 'IMAGE' | 'MARKDOWN' | 'CHART' | 'CHART_PLOTLY' | 'TABLE' | 'VECTOR_MAP_LAYER' | 'RASTER_MAP_LAYER'
    primary: boolean
    tags: string[]
    summary?: string
    description?: string
    correlation_uuid: string
    filename: string
    sources: Array<Source>
    attachments: AttachmentsObject
    rank: number
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

export type ActiveArtifactRef = Pick<Artifact, 'correlation_uuid' | 'filename'>

export interface ArtifactData extends Artifact {
    url: string // Contains the presigned url for the artifact
}
