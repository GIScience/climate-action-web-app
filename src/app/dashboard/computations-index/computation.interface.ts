import { GeoJSONFeature } from 'ol/format/GeoJSON'
import { Artifact, ArtifactEntity } from '../artifact/artifact.interface'
import { RunStatus } from '../common/status.types'
import { Plugin, PluginBaseInfo } from '../plugin/plugin.interface'

export interface ComputationParameters {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

export interface ComputationMetadata {
    correlation_uuid: string
    timestamp: Date
    params: ComputationParameters
    aoi: GeoJSONFeature
    artifacts: Artifact[]
    plugin_info: PluginBaseInfo
    status: RunStatus
    message: string
}

export interface ComputationEntity
    extends Pick<ComputationMetadata, 'correlation_uuid' | 'timestamp' | 'params' | 'status'> {
    artifacts: ArtifactEntity[]
    aoiName?: ComputationMetadata['aoi']['properties']['name']
    geometry?: ComputationMetadata['aoi']['geometry']
    pluginName?: Plugin['name']
    pluginId?: ComputationMetadata['plugin_info']['plugin_id']
    showSecondaryArtifacts?: boolean
    isExpanded?: boolean
    keepInDOM?: boolean
}

export type ComputationID = Pick<ComputationMetadata, 'correlation_uuid'>
