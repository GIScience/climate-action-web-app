import { SupportedLanguage } from '@app/types/language.types'
import type { Feature as GeoJSONFeature, MultiPolygon } from 'geojson'
import { Artifact, ArtifactEntity } from '../artifact/artifact.interface'
import { ComputationFlags, ComputationItemState, ComputationRunState } from '../common/status.types'
import { Plugin, PluginBaseInfo } from '../plugin/plugin.interface'

export interface ComputationParameters {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

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
    state?: ComputationItemState
}

export type ComputationDatabaseEntity = Pick<
    ComputationDisplayEntity,
    'correlation_uuid' | 'request_ts' | 'status' | 'aoiName' | 'pluginId' | 'flags' | 'state'
>

export type ComputationBasicInfo = Pick<
    ComputationDisplayEntity,
    'correlation_uuid' | 'aoiName' | 'geometry' | 'request_ts' | 'pluginId' | 'pluginName'
>

export type ComputationID = Pick<ComputationMetadata, 'correlation_uuid'>
