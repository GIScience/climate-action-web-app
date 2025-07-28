import { Feature } from 'ol'
import { MultiPolygon } from 'ol/geom'
import { Artifact, ArtifactEntity } from '../artifact/artifact.interface'
import { ComputationFlags, ComputationState } from '../common/status.types'
import { Plugin, PluginBaseInfo } from '../plugin/plugin.interface'

export interface ComputationParameters {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

export interface ComputationMetadata {
    correlation_uuid: string
    timestamp: Date
    params: ComputationParameters
    aoi: Feature<MultiPolygon>
    artifacts: Artifact[]
    plugin_info: PluginBaseInfo
    status: ComputationState
    message: string
    artifact_errors: { [key: string]: string }
}

export interface ComputationDisplayEntity
    extends Pick<ComputationMetadata, 'correlation_uuid' | 'timestamp' | 'params' | 'status' | 'artifact_errors'> {
    artifacts: ArtifactEntity[]
    aoiName?: string
    geometry?: ComputationMetadata['aoi']
    pluginName?: Plugin['name']
    pluginId?: ComputationMetadata['plugin_info']['plugin_id']
    showSecondaryArtifacts?: boolean
    isExpanded?: boolean
    keepInDOM?: boolean
    flags?: ComputationFlags
}

export type ComputationDatabaseEntity = Pick<
    ComputationDisplayEntity,
    'correlation_uuid' | 'timestamp' | 'status' | 'aoiName' | 'pluginId' | 'flags'
>

export type ComputationBasicInfo = Pick<
    ComputationDisplayEntity,
    'correlation_uuid' | 'aoiName' | 'geometry' | 'timestamp' | 'pluginId' | 'pluginName'
>

export type ComputationID = Pick<ComputationMetadata, 'correlation_uuid'>
