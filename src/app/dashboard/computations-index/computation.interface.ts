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
    'correlation_uuid' | 'request_ts' | 'params' | 'requested_params' | 'status' | 'artifact_errors'
> {
    artifacts: ArtifactEntity[]
    aoiName?: string
    geometry?: ComputationMetadata['aoi']
    pluginName?: Plugin['name']
    pluginId?: ComputationMetadata['plugin_info']['id']
    isExpanded?: boolean
    keepInDOM?: boolean
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
