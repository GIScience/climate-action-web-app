import { Artifact } from '../artifact/artifact.interface'
import { ComputationDatabaseEntity, ComputationMetadata } from './computation.interface'
import { mapDatabaseComputation, mapHydratedComputation } from './computation.mapper'

function createArtifact(overrides: Partial<Artifact> = {}): Artifact {
    return {
        name: 'Artifact',
        modality: 'IMAGE',
        primary: true,
        tags: [],
        correlation_uuid: 'test-uuid',
        filename: 'artifact-file',
        sources: [],
        attachments: {},
        rank: 1,
        ...overrides
    }
}

describe('computation mappers', () => {
    describe('mapDatabaseComputation', () => {
        it('should map a database entity to an unhydrated display entity', () => {
            const run: ComputationDatabaseEntity = {
                correlation_uuid: 'test-uuid',
                request_ts: new Date('2023-09-27T16:42:52+01:00'),
                status: 'SUCCESS',
                aoiName: 'Test AOI',
                pluginId: 'test_plugin',
                flags: ['NEW']
            }

            expect(mapDatabaseComputation(run)).toEqual({
                correlation_uuid: 'test-uuid',
                request_ts: run.request_ts,
                status: 'SUCCESS',
                aoiName: 'Test AOI',
                pluginId: 'test_plugin',
                flags: ['NEW'],
                state: undefined,
                artifacts: [],
                hydrated: false
            })
        })
    })

    describe('mapHydratedComputation', () => {
        const baseComputation = mapDatabaseComputation({
            correlation_uuid: 'test-uuid',
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
            status: 'SUCCESS',
            pluginId: 'test_plugin',
            aoiName: 'Stored AOI'
        })

        const metadata: ComputationMetadata = {
            correlation_uuid: 'test-uuid',
            request_ts: new Date('2023-10-01T10:00:00+01:00'),
            language: undefined,
            params: { year: 2023 },
            requested_params: { year: 2023 },
            aoi: {
                type: 'Feature',
                geometry: { type: 'MultiPolygon', coordinates: [] },
                properties: { name: 'Metadata AOI' }
            },
            artifacts: [],
            plugin_info: { id: 'metadata_plugin', version: '1.0.0' },
            status: 'SUCCESS',
            message: '',
            artifact_errors: { Indicator: 'failed' }
        }

        it('should merge metadata into the computation and mark it hydrated', () => {
            const hydrated = mapHydratedComputation(baseComputation, metadata)

            expect(hydrated).toEqual(
                expect.objectContaining({
                    correlation_uuid: 'test-uuid',
                    request_ts: baseComputation.request_ts,
                    status: 'SUCCESS',
                    aoiName: 'Metadata AOI',
                    geometry: metadata.aoi,
                    pluginId: 'metadata_plugin',
                    params: metadata.params,
                    requested_params: metadata.requested_params,
                    artifact_errors: metadata.artifact_errors,
                    hydrated: true
                })
            )
        })

        it('should fall back to existing values when metadata fields are missing', () => {
            const sparseMetadata = {
                ...metadata,
                request_ts: undefined,
                aoi: undefined,
                plugin_info: undefined,
                artifacts: undefined
            } as unknown as ComputationMetadata

            const hydrated = mapHydratedComputation(baseComputation, sparseMetadata)

            expect(hydrated.request_ts).toEqual(baseComputation.request_ts)
            expect(hydrated.aoiName).toBe('Stored AOI')
            expect(hydrated.pluginId).toBe('test_plugin')
            expect(hydrated.artifacts).toEqual([])
            expect(hydrated.hydrated).toBe(true)
        })

        it('should assign icons and order artifacts by modality then name', () => {
            const hydrated = mapHydratedComputation(baseComputation, {
                ...metadata,
                artifacts: [
                    createArtifact({ name: 'Table', modality: 'TABLE' }),
                    createArtifact({ name: 'Image B', modality: 'IMAGE' }),
                    createArtifact({ name: 'Summary', modality: 'MARKDOWN' }),
                    createArtifact({ name: 'Image A', modality: 'IMAGE' })
                ]
            })

            expect(hydrated.artifacts.map(artifact => [artifact.name, artifact.icon])).toEqual([
                ['Summary', 'description'],
                ['Image A', 'image'],
                ['Image B', 'image'],
                ['Table', 'table_chart']
            ])
        })
    })
})
