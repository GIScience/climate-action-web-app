import { ComponentRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { BehaviorSubject } from 'rxjs'
import { ArtifactData, ArtifactEntity } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { GeojsonComponent } from '../artifact/geojson/geojson.component'
import { MapArtifactManagerService } from './map-artifact-manager.service'
import type { MapService } from './map.service'

describe('MapArtifactManagerService', () => {
    let service: MapArtifactManagerService
    let mockArtifactService: {
        geojson: BehaviorSubject<ArtifactData | null>
        geotiff: BehaviorSubject<ArtifactData | null>
    }
    let mockMapService: jest.Mocked<Partial<MapService>>

    const createMockArtifact = (overrides: Partial<ArtifactEntity> = {}): ArtifactEntity => ({
        name: 'test-artifact',
        modality: 'MAP_LAYER_GEOJSON',
        file_path: './test.geojson',
        summary: 'Test artifact',
        description: 'Test description',
        correlation_uuid: `corr-${Math.random().toString(36).slice(2)}`,
        store_id: `store-${Math.random().toString(36).slice(2)}`,
        primary: false,
        tags: [],
        attachments: {},
        ...overrides
    })

    const artifact1 = createMockArtifact({ correlation_uuid: 'corr-1', store_id: 'store-1' })
    const artifact2 = createMockArtifact({ correlation_uuid: 'corr-2', store_id: 'store-2' })
    const artifact3 = createMockArtifact({ correlation_uuid: 'corr-3', store_id: 'store-3' })
    const nonMapArtifact = createMockArtifact({
        modality: 'IMAGE',
        correlation_uuid: 'corr-img',
        store_id: 'store-img'
    })

    beforeEach(() => {
        mockArtifactService = {
            geojson: new BehaviorSubject<ArtifactData | null>(null),
            geotiff: new BehaviorSubject<ArtifactData | null>(null)
        }

        mockMapService = {
            updateFoWGeometries: jest.fn(),
            clearFoWByType: jest.fn(),
            calculateMapPadding: jest.fn().mockReturnValue({ top: 50, right: 100, bottom: 50, left: 250 })
        }

        TestBed.configureTestingModule({
            providers: [MapArtifactManagerService, { provide: ArtifactService, useValue: mockArtifactService }]
        })

        service = TestBed.inject(MapArtifactManagerService)
        service.setMapInstance({} as never, mockMapService as unknown as MapService)
    })

    afterEach(() => {
        service.ngOnDestroy()
    })

    describe('addMapArtifact', () => {
        it('should add new artifact successfully', () => {
            const result = service.addMapArtifact(artifact1)

            expect(result).toBe(true)
            expect(service.isArtifactOnMap(artifact1)).toBe(true)
            expect(service.getActiveMapArtifacts()).toHaveLength(1)
        })

        it('should not add non-map artifacts', () => {
            const result = service.addMapArtifact(nonMapArtifact)

            expect(result).toBe(false)
            expect(service.getActiveMapArtifacts()).toHaveLength(0)
        })

        it('should respect MAX_MAP_ARTIFACTS limit by removing unpinned', () => {
            service.addMapArtifact(artifact1)
            service.addMapArtifact(artifact2)
            const result = service.addMapArtifact(artifact3)

            expect(result).toBe(true)
            expect(service.getActiveMapArtifacts()).toHaveLength(2)
            expect(service.isArtifactOnMap(artifact1)).toBe(false)
            expect(service.isArtifactOnMap(artifact2)).toBe(true)
            expect(service.isArtifactOnMap(artifact3)).toBe(true)
        })

        it('should return true for already existing artifact', () => {
            service.addMapArtifact(artifact1)
            const result = service.addMapArtifact(artifact1)

            expect(result).toBe(true)
            expect(service.getActiveMapArtifacts()).toHaveLength(1)
        })
    })

    describe('removeMapArtifact', () => {
        it('should remove existing artifact and return true', () => {
            service.addMapArtifact(artifact1)
            const result = service.removeMapArtifact(artifact1)

            expect(result).toBe(true)
            expect(service.isArtifactOnMap(artifact1)).toBe(false)
        })

        it('should destroy componentRef on removal', () => {
            service.addMapArtifact(artifact1)
            const mockComponentRef = { destroy: jest.fn() } as unknown as ComponentRef<GeojsonComponent>
            service.updateLayerInfo(artifact1, ['layer-1'], 'source-1', mockComponentRef)

            service.removeMapArtifact(artifact1)

            expect(mockComponentRef.destroy).toHaveBeenCalled()
        })

        it('should update fog of war after removal', () => {
            service.addMapArtifact(artifact1)
            service.removeMapArtifact(artifact1)

            expect(mockMapService.clearFoWByType).toHaveBeenCalledWith('pinned')
        })
    })

    describe('updateLayerInfo', () => {
        it('should update layerIds and sourceId for existing artifact', () => {
            service.addMapArtifact(artifact1)

            service.updateLayerInfo(artifact1, ['layer-1', 'layer-2'], 'source-1')

            const layer = service.getLayerInfo(artifact1)
            expect(layer?.layerIds).toEqual(['layer-1', 'layer-2'])
            expect(layer?.sourceId).toBe('source-1')
        })

        it('should preserve existing componentRef if not provided', () => {
            service.addMapArtifact(artifact1)
            const mockComponentRef = { destroy: jest.fn() } as unknown as ComponentRef<GeojsonComponent>
            service.updateLayerInfo(artifact1, ['layer-1'], 'source-1', mockComponentRef)

            service.updateLayerInfo(artifact1, ['layer-2'], 'source-2')

            const layer = service.getLayerInfo(artifact1)
            expect(layer?.componentRef).toBe(mockComponentRef)
            expect(layer?.layerIds).toEqual(['layer-2'])
        })
    })

    describe('promoteToPin', () => {
        it('should promote unpinned artifact to pinned', () => {
            service.addMapArtifact(artifact1)

            const result = service.promoteToPin(artifact1)

            expect(result).toBe(true)
            expect(service.isArtifactPersisted(artifact1)).toBe(true)
        })

        it('should return false if already pinned', () => {
            service.addMapArtifact(artifact1, { pinned: true })

            const result = service.promoteToPin(artifact1)

            expect(result).toBe(false)
        })

        it('should update fog of war when promoting', () => {
            service.addMapArtifact(artifact1)
            jest.clearAllMocks()

            service.promoteToPin(artifact1)

            expect(mockMapService.clearFoWByType).toHaveBeenCalled()
        })
    })

    describe('unpinArtifact', () => {
        it('should unpin a pinned artifact', () => {
            service.addMapArtifact(artifact1, { pinned: true })

            const result = service.unpinArtifact(artifact1)

            expect(result).toBe(true)
            expect(service.isArtifactPersisted(artifact1)).toBe(false)
        })
    })

    describe('clearTransientArtifacts', () => {
        it('should clear all unpinned artifacts when no computationId', () => {
            service.addMapArtifact(artifact1)
            service.addMapArtifact(artifact2, { pinned: true })

            service.clearTransientArtifacts()

            expect(service.isArtifactOnMap(artifact1)).toBe(false)
            expect(service.isArtifactOnMap(artifact2)).toBe(true)
        })

        it('should clear only matching computationId artifacts', () => {
            service.addMapArtifact(artifact1, { computationId: 'comp-1' })
            service.addMapArtifact(artifact2, { computationId: 'comp-2' })

            service.clearTransientArtifacts('comp-1')

            expect(service.isArtifactOnMap(artifact1)).toBe(false)
            expect(service.isArtifactOnMap(artifact2)).toBe(true)
        })

        it('should preserve pinned artifacts regardless of computationId', () => {
            service.addMapArtifact(artifact1, { pinned: true, computationId: 'comp-1' })

            service.clearTransientArtifacts('comp-1')

            expect(service.isArtifactOnMap(artifact1)).toBe(true)
        })
    })
})
