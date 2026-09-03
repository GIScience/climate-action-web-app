import { Artifact, ArtifactEntity } from '../artifact/artifact.interface'
import { ComputationDatabaseEntity, ComputationDisplayEntity, ComputationMetadata } from './computation.interface'

const ARTIFACT_ICON_BY_MODALITY: Record<Artifact['modality'], string> = {
    IMAGE: 'image',
    MARKDOWN: 'description',
    CHART: 'data_usage',
    CHART_PLOTLY: 'bar_chart',
    TABLE: 'table_chart',
    VECTOR_MAP_LAYER: 'layers',
    RASTER_MAP_LAYER: 'map'
}

const ARTIFACT_ORDER_BY_ICON: Record<string, number> = {
    description: 1,
    image: 2,
    layers: 3,
    map: 4,
    data_usage: 5,
    bar_chart: 6,
    table_chart: 7
}

function toArtifactEntity(artifact: Artifact): ArtifactEntity {
    return {
        ...artifact,
        icon: ARTIFACT_ICON_BY_MODALITY[artifact.modality]
    }
}

function compareArtifacts(a: ArtifactEntity, b: ArtifactEntity): number {
    if (a.icon === b.icon) {
        return (a.name || '').localeCompare(b.name || '')
    }

    const aOrder = a.icon ? (ARTIFACT_ORDER_BY_ICON[a.icon] ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
    const bOrder = b.icon ? (ARTIFACT_ORDER_BY_ICON[b.icon] ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
    return aOrder - bOrder
}

export function mapDatabaseComputation(run: ComputationDatabaseEntity): ComputationDisplayEntity {
    return {
        correlation_uuid: run.correlation_uuid,
        request_ts: run.request_ts,
        status: run.status,
        aoiName: run.aoiName,
        pluginId: run.pluginId,
        flags: run.flags,
        state: run.state,
        artifacts: [],
        hydrated: false
    }
}

export function mapHydratedComputation(
    computation: ComputationDisplayEntity,
    metadata: ComputationMetadata
): ComputationDisplayEntity {
    return {
        ...computation,
        status: metadata.status,
        request_ts: computation.request_ts ?? metadata.request_ts,
        language: metadata.language,
        aoiName: (metadata.aoi?.properties?.['name'] as string | undefined) ?? computation.aoiName,
        geometry: metadata.aoi,
        pluginId: metadata.plugin_info?.id ?? computation.pluginId,
        params: metadata.params,
        requested_params: metadata.requested_params,
        artifact_errors: metadata.artifact_errors,
        artifacts: Array.isArray(metadata.artifacts)
            ? metadata.artifacts.map(toArtifactEntity).sort(compareArtifacts)
            : [],
        hydrated: true
    }
}
