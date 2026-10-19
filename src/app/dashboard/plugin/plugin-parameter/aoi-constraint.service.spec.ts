import { HttpRequest } from '@angular/common/http'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { fakeAsync, TestBed, tick } from '@angular/core/testing'
import { Plugin } from '@app/dashboard/plugin/plugin.interface'
import type { FeatureCollection, Feature as GeoJSONFeature, MultiPolygon } from 'geojson'
import { environment } from 'src/environments/environment'
import { AoiConstraintService } from './aoi-constraint.service'

const collectionUrl = `${environment.heigitMapsUrl}/vector/service/ohsome/ogc/features/v1/collections/admin_world_water/items`

// The single CQL-filtered request for the given ids
const boundaryRequest =
    (...ids: number[]) =>
    (req: HttpRequest<unknown>) =>
        req.url === collectionUrl &&
        req.params.get('limit') === String(ids.length) &&
        req.params.get('filter') === `id IN (${ids.map(id => `'${id}'`).join(', ')})` &&
        req.params.get('filter-lang') === 'cql2-text'

const collection = (...features: GeoJSONFeature[]): FeatureCollection => ({ type: 'FeatureCollection', features })

const square = (west: number, south: number, east: number, north: number): MultiPolygon => ({
    type: 'MultiPolygon',
    coordinates: [
        [
            [
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south]
            ]
        ]
    ]
})

const feature = (geometry: MultiPolygon, properties: Record<string, unknown> = {}): GeoJSONFeature => ({
    type: 'Feature',
    geometry,
    properties
})

const pluginWith = (constraints: Plugin['aoi_constraints']): Plugin =>
    ({ id: 'test-plugin', aoi_constraints: constraints }) as Plugin

describe('AoiConstraintService', () => {
    let service: AoiConstraintService
    let httpMock: HttpTestingController

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AoiConstraintService]
        })
        service = TestBed.inject(AoiConstraintService)
        httpMock = TestBed.inject(HttpTestingController)
    })

    afterEach(() => {
        httpMock.verify()
    })

    it('has no constraints and validates everything when aoi_constraints is absent', () => {
        service.activate(pluginWith(undefined))
        expect(service.hasConstraints).toBe(false)
        expect(service.validate(feature(square(0, 0, 1, 1), { area: 99999 }))).toBeNull()
    })

    it('only enforces the first constraint group', () => {
        service.activate(
            pluginWith([
                [{ constraint_type: 'AreaConstraint', min_area: 0, max_area: 100 }],
                [{ constraint_type: 'AreaConstraint', min_area: 0, max_area: 1 }]
            ])
        )
        expect(service.validate(feature(square(0, 0, 1, 1), { area: 50 }))).toBeNull()
    })

    describe('AreaConstraint', () => {
        beforeEach(() => {
            service.activate(pluginWith([[{ constraint_type: 'AreaConstraint', min_area: 0.1, max_area: 10 }]]))
        })

        it('accepts areas within the bounds, inclusive', () => {
            expect(service.validate(feature(square(0, 0, 1, 1), { area: 0.1 }))).toBeNull()
            expect(service.validate(feature(square(0, 0, 1, 1), { area: 5 }))).toBeNull()
            expect(service.validate(feature(square(0, 0, 1, 1), { area: 10 }))).toBeNull()
        })

        it('rejects areas outside the bounds', () => {
            expect(service.validate(feature(square(0, 0, 1, 1), { area: 0.05 }))).toEqual({ kind: 'area' })
            expect(service.validate(feature(square(0, 0, 1, 1), { area: 10.5 }))).toEqual({ kind: 'area' })
        })
    })

    describe('CoveredByGeomConstraint', () => {
        const allowed = square(8, 49, 9, 50)

        beforeEach(() => {
            service.activate(
                pluginWith([
                    [{ constraint_type: 'CoveredByGeomConstraint', geom: allowed, description: 'Rhine Valley' }]
                ])
            )
        })

        it('accepts a selection fully inside the geom', () => {
            expect(service.validate(feature(square(8.2, 49.2, 8.8, 49.8)))).toBeNull()
        })

        it('accepts a selection identical to the geom', () => {
            expect(service.validate(feature(allowed))).toBeNull()
        })

        it('rejects even a meters-wide overshoot along the border (no tolerance for the custom geom)', () => {
            // Extends by ~36m
            expect(service.validate(feature(square(8, 49, 9.0005, 50)))).toEqual({ kind: 'outside-region' })
        })

        it('rejects a partially overlapping selection', () => {
            expect(service.validate(feature(square(8.5, 49.5, 9.5, 50.5)))).toEqual({ kind: 'outside-region' })
        })

        it('rejects a fully outside selection', () => {
            expect(service.validate(feature(square(10, 51, 11, 52)))).toEqual({ kind: 'outside-region' })
        })
    })

    describe('CoveredByBoundaryConstraint', () => {
        const boundaryA = feature(square(8, 49, 9, 50), { id: -90689, name: 'Region A', name_de: 'Gebiet A' })
        const boundaryB = feature(square(9, 49, 10, 50), { id: -90690, name: 'Region B' })
        const flushBoundaries = (...features: GeoJSONFeature[]) =>
            httpMock.expectOne(boundaryRequest(-90689, -90690)).flush(collection(...features))

        beforeEach(() => {
            service.activate(
                pluginWith([[{ constraint_type: 'CoveredByBoundaryConstraint', osm_ids: [-90689, -90690] }]])
            )
        })

        it('reports loading until the boundary geometries arrive', () => {
            expect(service.loadState).toBe('loading')
            expect(service.validate(feature(square(8.2, 49.2, 8.8, 49.8)))).toEqual({ kind: 'loading' })
            flushBoundaries(boundaryA, boundaryB)
        })

        it('accepts a selection inside a single boundary', () => {
            flushBoundaries(boundaryA, boundaryB)
            expect(service.loadState).toBe('ready')
            expect(service.validate(feature(square(8.2, 49.2, 8.8, 49.8)))).toBeNull()
        })

        it('accepts a selection spanning two adjacent boundaries (their union)', () => {
            flushBoundaries(boundaryA, boundaryB)
            expect(service.validate(feature(square(8.5, 49.2, 9.5, 49.8)))).toBeNull()
        })

        it('rejects a selection extending beyond the union of the boundaries', () => {
            flushBoundaries(boundaryA, boundaryB)
            expect(service.validate(feature(square(8.5, 49.2, 10.5, 49.8)))).toEqual({ kind: 'outside-region' })
        })

        it('tolerates a meters-wide overshoot along the border (mismatched border generalizations)', () => {
            flushBoundaries(boundaryA, boundaryB)
            // Extends by ~36m
            expect(service.validate(feature(square(8, 49, 10.0005, 50)))).toBeNull()
        })

        it('rejects an overshoot beyond the coverage tolerance', () => {
            flushBoundaries(boundaryA, boundaryB)
            // Extends by ~215m
            expect(service.validate(feature(square(8, 49, 10.003, 50)))).toEqual({ kind: 'outside-region' })
        })

        it('retries a failed fetch and fails closed once the retries are exhausted', fakeAsync(() => {
            httpMock.expectOne(boundaryRequest(-90689, -90690)).error(new ProgressEvent('error'))
            tick(400)
            httpMock.expectOne(boundaryRequest(-90689, -90690)).error(new ProgressEvent('error'))
            tick(400)
            expect(service.loadState).toBe('loading')
            httpMock.expectOne(boundaryRequest(-90689, -90690)).error(new ProgressEvent('error'))
            expect(service.loadState).toBe('error')
            expect(service.validate(feature(square(8.2, 49.2, 8.8, 49.8)))).toEqual({ kind: 'load-failed' })
        }))

        it('validates against the returned subset when some boundaries are missing from the response', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
            flushBoundaries(boundaryA)
            expect(service.loadState).toBe('ready')
            expect(warnSpy).toHaveBeenCalled()
            expect(service.validate(feature(square(8.2, 49.2, 8.8, 49.8)))).toBeNull()
            expect(service.validate(feature(square(9.2, 49.2, 9.8, 49.8)))).toEqual({ kind: 'outside-region' })
            warnSpy.mockRestore()
        })

        it('describes the constraint with the localized names of the loaded boundaries', () => {
            expect(service.describeConstraints('en')).toEqual([{ kind: 'covered-by-boundary', names: [] }])
            flushBoundaries(boundaryA, boundaryB)
            expect(service.describeConstraints('en')).toEqual([
                { kind: 'covered-by-boundary', names: ['Region A', 'Region B'] }
            ])
            expect(service.describeConstraints('de')).toEqual([
                { kind: 'covered-by-boundary', names: ['Gebiet A', 'Region B'] }
            ])
        })

        it('emits geometriesChanged$ when the fetch settles', () => {
            const emitted = jest.fn()
            service.geometriesChanged$.subscribe(emitted)
            flushBoundaries(boundaryA, boundaryB)
            expect(emitted).toHaveBeenCalledTimes(1)
        })
    })

    describe('BoundarySelectionConstraint', () => {
        beforeEach(() => {
            service.activate(
                pluginWith([[{ constraint_type: 'BoundarySelectionConstraint', osm_ids: [-11674964, -14320076] }]])
            )
            httpMock
                .expectOne(boundaryRequest(-11674964, -14320076))
                .flush(
                    collection(
                        feature(square(8, 49, 9, 50), { id: -11674964 }),
                        feature(square(9, 49, 10, 50), { id: -14320076 })
                    )
                )
        })

        it('matches allowed ids whether the feature id is a string or a number', () => {
            expect(service.validate(feature(square(8, 49, 9, 50), { id: '-11674964' }))).toBeNull()
            expect(service.validate(feature(square(8, 49, 9, 50), { id: -14320076 }))).toBeNull()
        })

        it('exposes the fetched boundary geometries for the FoW overlay', () => {
            expect(service.allowedGeometries).toHaveLength(2)
        })
    })

    it('combines constraints within a group with AND semantics', () => {
        service.activate(
            pluginWith([
                [
                    { constraint_type: 'AreaConstraint', min_area: 0, max_area: 5 },
                    {
                        constraint_type: 'CoveredByGeomConstraint',
                        geom: square(8, 49, 9, 50),
                        description: 'Rhine Valley'
                    }
                ]
            ])
        )
        expect(service.validate(feature(square(8.2, 49.2, 8.4, 49.4), { area: 2 }))).toBeNull()
        expect(service.validate(feature(square(8.2, 49.2, 8.4, 49.4), { area: 6 }))).toEqual({ kind: 'area' })
        expect(service.validate(feature(square(10, 51, 11, 52), { area: 2 }))).toEqual({ kind: 'outside-region' })
    })

    it('describes area and custom geom constraints', () => {
        service.activate(
            pluginWith([
                [
                    { constraint_type: 'AreaConstraint', min_area: 0.1, max_area: 10 },
                    {
                        constraint_type: 'CoveredByGeomConstraint',
                        geom: square(8, 49, 9, 50),
                        description: 'Rhine Valley'
                    }
                ]
            ])
        )
        expect(service.describeConstraints('en')).toEqual([
            { kind: 'area', minArea: 0.1, maxArea: 10, names: [] },
            { kind: 'covered-by-geom', names: ['Rhine Valley'] }
        ])
    })

    it('cancels the in-flight fetch and resets state on deactivate', () => {
        service.activate(pluginWith([[{ constraint_type: 'CoveredByBoundaryConstraint', osm_ids: [-90689] }]]))
        service.deactivate()
        expect(httpMock.expectOne(boundaryRequest(-90689)).cancelled).toBe(true)
        expect(service.hasConstraints).toBe(false)
        expect(service.loadState).toBe('ready')
        expect(service.allowedGeometries).toHaveLength(0)
    })
})
