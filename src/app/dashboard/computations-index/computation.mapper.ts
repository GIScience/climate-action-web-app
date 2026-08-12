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

    if (a.icon && b.icon && a.icon in ARTIFACT_ORDER_BY_ICON && b.icon in ARTIFACT_ORDER_BY_ICON) {
        return ARTIFACT_ORDER_BY_ICON[a.icon] - ARTIFACT_ORDER_BY_ICON[b.icon]
    }
    return 0
}

export function mapComputationMetadata(
    run: ComputationDatabaseEntity,
    metadata: ComputationMetadata
): ComputationDisplayEntity {
    return {
        correlation_uuid: run.correlation_uuid,
        request_ts: metadata.request_ts,
        status: metadata.status,
        language: metadata.language,
        aoiName: metadata.aoi?.properties?.['name'] as string | undefined,
        geometry: metadata.aoi,
        pluginId: metadata.plugin_info?.id,
        params: metadata.params,
        requested_params: metadata.requested_params,
        artifact_errors: metadata.artifact_errors,
        flags: run.flags,
        artifacts: Array.isArray(metadata.artifacts)
            ? metadata.artifacts.map(toArtifactEntity).sort(compareArtifacts)
            : []
    }
}
