import {GeoJSONFeature} from 'ol/format/GeoJSON'
import {MultiPolygon} from 'ol/geom'
import {RunStatus} from '../common/status.types'

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

export interface ArtifactParams {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
    aoi?: GeoJSONFeature // Keeping this for now for backwards compatibility
}

export interface PluginInfo {
    name: string
    plugin_id: string
}

export interface ArtifactMetadata {
    correlation_uuid: string
    timestamp: Date
    params: ArtifactParams
    artifacts: Artifact[]
    plugin_info: PluginInfo
    status: RunStatus
    aoi?: GeoJSONFeature
}

export interface ArtifactComputation {
    name: string
    uuid: string
    children: ArtifactComputation[]
    timestamp?: Date
    icon?: string
    summary?: string
    status?: RunStatus
    ref?: Artifact
    isExpanded?: boolean
    keepInDOM?: boolean
    showSecondaryChildren?: boolean
    aoiName?: string
    geometry?: MultiPolygon
    pluginId?: string
}

export interface Artifact {
    name: string
    modality: 'IMAGE' | 'MARKDOWN' | 'CHART' | 'TABLE' | 'MAP_LAYER_GEOJSON' | 'MAP_LAYER_GEOTIFF'
    file_path: string
    summary: string
    description: string
    correlation_uuid: string
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