export interface ArtifactType {
    name: string,
    modality: "TEXT" | "IMAGE" | "GEO-DATA",
    file_path: string,
    summary: string,
    description: string,
    correlation_uuid: string,
    params: {},
    store_id: string
}
