import { SupportedLanguage } from '@app/types/language.types'
import type { FeatureCollection, Feature as GeoJSONFeature, MultiPolygon, Point } from 'geojson'
import { Artifact, ArtifactEntity } from '../artifact/artifact.interface'
import { ComputationFlags, ComputationRunState } from '../common/status.types'
import { Plugin, PluginBaseInfo } from '../plugin/plugin.interface'

export type DiscoverTab = 'discover' | 'bookmarks'

export interface ComputationParameters {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

export interface SearchEntry {
    correlation_uuid: string
    request_ts: Date
    plugin_id: string
    aoi_name: string
    language?: SupportedLanguage
}

export interface SearchPage {
    items: SearchEntry[]
    current_page: string | null
    current_page_backwards: string | null
    previous_page: string | null
    next_page: string | null
}

// Shared by the search centroids endpoint and the aoi_boundary vector tiles
export interface AoiFeatureProperties {
    correlation_uuid: string
    aoi_name: string
    min_zoom?: number
}

export type SearchCentroidCollection = FeatureCollection<Point, AoiFeatureProperties>

export interface ComputationMetadata {
    correlation_uuid: string
    request_ts: Date
    language?: SupportedLanguage
    params: ComputationParameters
    requested_params?: ComputationParameters
    aoi: GeoJSONFeature<MultiPolygon>
    artifacts: Artifact[]
    plugin_info: PluginBaseInfo
    status: ComputationRunState
    message: string
    artifact_errors: { [key: string]: string }
}

export interface ComputationDisplayEntity extends Pick<
    ComputationMetadata,
    'correlation_uuid' | 'request_ts' | 'language' | 'status'
> {
    artifacts: ArtifactEntity[]
    params?: ComputationParameters
    requested_params?: ComputationParameters
    artifact_errors?: ComputationMetadata['artifact_errors']
    aoiName?: string
    geometry?: ComputationMetadata['aoi']
    pluginName?: Plugin['name']
    pluginId?: ComputationMetadata['plugin_info']['id']
    isExpanded?: boolean
    loading?: boolean
    keepInDOM?: boolean
    hydrated?: boolean
    flags?: ComputationFlags
}

export type ComputationDatabaseEntity = Pick<
    ComputationDisplayEntity,
    'correlation_uuid' | 'request_ts' | 'status' | 'aoiName' | 'pluginId' | 'language' | 'flags'
>

export type ComputationBasicInfo = Pick<
    ComputationDisplayEntity,
    'correlation_uuid' | 'aoiName' | 'geometry' | 'request_ts' | 'pluginId' | 'pluginName'
>

export type ComputationID = Pick<ComputationMetadata, 'correlation_uuid'>
