import { Artifact } from '../artifact/artifact.interface'
import { ComputationDatabaseEntity, ComputationMetadata } from './computation.interface'
import { mapComputationMetadata } from './computation.mapper'

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
    describe('mapComputationMetadata', () => {
        const run: ComputationDatabaseEntity = {
            correlation_uuid: 'test-uuid',
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
            status: 'SUCCESS',
            aoiName: 'Test AOI',
            pluginId: 'test_plugin',
            flags: ['NEW']
        }

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

        it('should map metadata into a display entity, keeping the run identity and flags', () => {
            expect(mapComputationMetadata(run, metadata)).toEqual(
                expect.objectContaining({
                    correlation_uuid: 'test-uuid',
                    request_ts: metadata.request_ts,
                    status: 'SUCCESS',
                    aoiName: 'Metadata AOI',
                    geometry: metadata.aoi,
                    pluginId: 'metadata_plugin',
                    params: metadata.params,
                    requested_params: metadata.requested_params,
                    artifact_errors: metadata.artifact_errors,
                    flags: ['NEW'],
                    artifacts: []
                })
            )
        })

        it('should default artifacts to an empty array when metadata provides none', () => {
            const sparseMetadata = { ...metadata, artifacts: undefined } as unknown as ComputationMetadata

            expect(mapComputationMetadata(run, sparseMetadata).artifacts).toEqual([])
        })

        it('should assign icons and order artifacts by modality then name', () => {
            const mapped = mapComputationMetadata(run, {
                ...metadata,
                artifacts: [
                    createArtifact({ name: 'Table', modality: 'TABLE' }),
                    createArtifact({ name: 'Image B', modality: 'IMAGE' }),
                    createArtifact({ name: 'Summary', modality: 'MARKDOWN' }),
                    createArtifact({ name: 'Image A', modality: 'IMAGE' })
                ]
            })

            expect(mapped.artifacts.map(artifact => [artifact.name, artifact.icon])).toEqual([
                ['Summary', 'description'],
                ['Image A', 'image'],
                ['Image B', 'image'],
                ['Table', 'table_chart']
            ])
        })
    })
})
