import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { Plugin } from '@app/dashboard/plugin/plugin.interface'
import type { Feature as GeoJSONFeature, MultiPolygon } from 'geojson'
import { environment } from 'src/environments/environment'
import { AoiConstraintService } from './aoi-constraint.service'

const ogcItemUrl = (id: number) =>
    `${environment.heigitMapsUrl}/vector/service/ohsome/ogc/features/v1/collections/admin_world_water/items/${id}`

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

        it('accepts a selection identical to the geom (sliver tolerance)', () => {
            expect(service.validate(feature(allowed))).toBeNull()
        })

        it('tolerates a meters-wide overshoot along the border (mismatched border generalizations)', () => {
            // Extends by ~36m
            expect(service.validate(feature(square(8, 49, 9.0005, 50)))).toBeNull()
        })

        it('rejects an overshoot beyond the coverage tolerance', () => {
            // Extends by ~215m
            expect(service.validate(feature(square(8, 49, 9.003, 50)))).toEqual({ kind: 'outside-region' })
        })

        it('rejects a partially overlapping selection', () => {
            expect(service.validate(feature(square(8.5, 49.5, 9.5, 50.5)))).toEqual({ kind: 'outside-region' })
        })

        it('rejects a fully outside selection', () => {
            expect(service.validate(feature(square(10, 51, 11, 52)))).toEqual({ kind: 'outside-region' })
        })
    })

    describe('CoveredByBoundaryConstraint', () => {
        const boundaryA = feature(square(8, 49, 9, 50), { name: 'Region A', name_de: 'Gebiet A' })
        const boundaryB = feature(square(9, 49, 10, 50), { name: 'Region B' })

        beforeEach(() => {
            service.activate(
                pluginWith([[{ constraint_type: 'CoveredByBoundaryConstraint', osm_ids: [-90689, -90690] }]])
            )
        })

        it('reports loading until the boundary geometries arrive', () => {
            expect(service.loadState).toBe('loading')
            expect(service.validate(feature(square(8.2, 49.2, 8.8, 49.8)))).toEqual({ kind: 'loading' })
            httpMock.expectOne(ogcItemUrl(-90689)).flush(boundaryA)
            httpMock.expectOne(ogcItemUrl(-90690)).flush(boundaryB)
        })

        it('accepts a selection inside a single boundary', () => {
            httpMock.expectOne(ogcItemUrl(-90689)).flush(boundaryA)
            httpMock.expectOne(ogcItemUrl(-90690)).flush(boundaryB)
            expect(service.loadState).toBe('ready')
            expect(service.validate(feature(square(8.2, 49.2, 8.8, 49.8)))).toBeNull()
        })

        it('accepts a selection spanning two adjacent boundaries (their union)', () => {
            httpMock.expectOne(ogcItemUrl(-90689)).flush(boundaryA)
            httpMock.expectOne(ogcItemUrl(-90690)).flush(boundaryB)
            expect(service.validate(feature(square(8.5, 49.2, 9.5, 49.8)))).toBeNull()
        })

        it('rejects a selection extending beyond the union of the boundaries', () => {
            httpMock.expectOne(ogcItemUrl(-90689)).flush(boundaryA)
            httpMock.expectOne(ogcItemUrl(-90690)).flush(boundaryB)
            expect(service.validate(feature(square(8.5, 49.2, 10.5, 49.8)))).toEqual({ kind: 'outside-region' })
        })

        it('fails closed when all boundary fetches fail', () => {
            httpMock.expectOne(ogcItemUrl(-90689)).error(new ProgressEvent('error'))
            httpMock.expectOne(ogcItemUrl(-90690)).error(new ProgressEvent('error'))
            expect(service.loadState).toBe('error')
            expect(service.validate(feature(square(8.2, 49.2, 8.8, 49.8)))).toEqual({ kind: 'load-failed' })
        })

        it('validates against the successful subset when some fetches fail', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
            httpMock.expectOne(ogcItemUrl(-90689)).flush(boundaryA)
            httpMock.expectOne(ogcItemUrl(-90690)).error(new ProgressEvent('error'))
            expect(service.loadState).toBe('ready')
            expect(warnSpy).toHaveBeenCalled()
            expect(service.validate(feature(square(8.2, 49.2, 8.8, 49.8)))).toBeNull()
            expect(service.validate(feature(square(9.2, 49.2, 9.8, 49.8)))).toEqual({ kind: 'outside-region' })
            warnSpy.mockRestore()
        })

        it('describes the constraint with the localized names of the loaded boundaries', () => {
            expect(service.describeConstraints('en')).toEqual([{ kind: 'covered-by-boundary', names: [] }])
            httpMock.expectOne(ogcItemUrl(-90689)).flush(boundaryA)
            httpMock.expectOne(ogcItemUrl(-90690)).flush(boundaryB)
            expect(service.describeConstraints('en')).toEqual([
                { kind: 'covered-by-boundary', names: ['Region A', 'Region B'] }
            ])
            expect(service.describeConstraints('de')).toEqual([
                { kind: 'covered-by-boundary', names: ['Gebiet A', 'Region B'] }
            ])
        })

        it('emits geometriesChanged$ when the fetches settle', () => {
            const emitted = jest.fn()
            service.geometriesChanged$.subscribe(emitted)
            httpMock.expectOne(ogcItemUrl(-90689)).flush(boundaryA)
            httpMock.expectOne(ogcItemUrl(-90690)).flush(boundaryB)
            expect(emitted).toHaveBeenCalledTimes(1)
        })
    })

    describe('BoundarySelectionConstraint', () => {
        beforeEach(() => {
            service.activate(
                pluginWith([[{ constraint_type: 'BoundarySelectionConstraint', osm_ids: [-11674964, -14320076] }]])
            )
            httpMock.expectOne(ogcItemUrl(-11674964)).flush(feature(square(8, 49, 9, 50)))
            httpMock.expectOne(ogcItemUrl(-14320076)).flush(feature(square(9, 49, 10, 50)))
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

    it('cancels in-flight fetches and resets state on deactivate', () => {
        service.activate(pluginWith([[{ constraint_type: 'CoveredByBoundaryConstraint', osm_ids: [-90689] }]]))
        service.deactivate()
        httpMock.expectOne(ogcItemUrl(-90689))
        expect(service.hasConstraints).toBe(false)
        expect(service.loadState).toBe('ready')
        expect(service.allowedGeometries).toHaveLength(0)
    })
})
