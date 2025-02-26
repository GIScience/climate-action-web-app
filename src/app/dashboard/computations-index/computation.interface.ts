import { Artifact, ArtifactEntity } from '../artifact/artifact.interface'
import { RunStatus } from '../common/status.types'
import { Plugin, PluginBaseInfo } from '../plugin/plugin.interface'
import { Feature } from 'ol'
import { MultiPolygon } from 'ol/geom'

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
    status: RunStatus
    message: string
}

export interface ComputationEntity
    extends Pick<ComputationMetadata, 'correlation_uuid' | 'timestamp' | 'params' | 'status'> {
    artifacts: ArtifactEntity[]
    aoiName?: string
    geometry?: ComputationMetadata['aoi']
    pluginName?: Plugin['name']
    pluginId?: ComputationMetadata['plugin_info']['plugin_id']
    showSecondaryArtifacts?: boolean
    isExpanded?: boolean
    keepInDOM?: boolean
}

export interface ComputationBasicInfo
    extends Pick<ComputationEntity, 'correlation_uuid' | 'aoiName' | 'geometry' | 'timestamp'> {}

export type ComputationID = Pick<ComputationMetadata, 'correlation_uuid'>
