import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { MapGeoJsonUtils } from '@app/dashboard/map/utils/map-geojson.utils'
import {
    AoiConstraint,
    AreaConstraint,
    BoundarySelectionConstraint,
    CoveredByBoundaryConstraint,
    CoveredByGeomConstraint,
    Plugin
} from '@app/dashboard/plugin/plugin.interface'
import { resolveLocalizedName } from '@app/utils/localized-name.utils'
import type { Feature as GeoJSONFeature, Geometry, MultiPolygon, Polygon } from 'geojson'
import { catchError, forkJoin, of, Subject, Subscription } from 'rxjs'
import { environment } from 'src/environments/environment'

export type AoiViolationKind = 'area' | 'outside-region' | 'not-allowed-boundary' | 'load-failed' | 'loading'

export interface AoiViolation {
    kind: AoiViolationKind
}

// Human-readable summary of the constraint
export interface AoiConstraintDescription {
    kind: 'area' | 'covered-by-geom' | 'covered-by-boundary' | 'boundary-selection'
    minArea?: number
    maxArea?: number
    names: string[]
}

export type ConstraintLoadState = 'loading' | 'ready' | 'error'

@Injectable()
export class AoiConstraintService {
    private http = inject(HttpClient)

    // Emits when boundary geometry fetches settle (success or error)
    readonly geometriesChanged$ = new Subject<void>()

    private constraints: AoiConstraint[] = []
    private boundaryGeometries = new Map<number, GeoJSONFeature>()
    private dilatedOutersCache = new Map<AoiConstraint, (Polygon | MultiPolygon)[]>()
    private fetchSubscription?: Subscription
    private _loadState: ConstraintLoadState = 'ready'

    activate(plugin: Plugin): void {
        this.deactivate()
        this.constraints = plugin.aoi_constraints?.[0] ?? []
        this.fetchBoundaryGeometries()
    }

    deactivate(): void {
        this.fetchSubscription?.unsubscribe()
        this.fetchSubscription = undefined
        this.constraints = []
        this.boundaryGeometries.clear()
        this.dilatedOutersCache.clear()
        this._loadState = 'ready'
    }

    get hasConstraints(): boolean {
        return this.constraints.length > 0
    }

    get areaConstraint(): AreaConstraint | undefined {
        return this.constraints.find(c => c.constraint_type === 'AreaConstraint')
    }

    get boundarySelectionConstraint(): BoundarySelectionConstraint | undefined {
        return this.constraints.find(c => c.constraint_type === 'BoundarySelectionConstraint')
    }

    private get coveredByGeomConstraint(): CoveredByGeomConstraint | undefined {
        return this.constraints.find(c => c.constraint_type === 'CoveredByGeomConstraint')
    }

    private get coveredByBoundaryConstraint(): CoveredByBoundaryConstraint | undefined {
        return this.constraints.find(c => c.constraint_type === 'CoveredByBoundaryConstraint')
    }

    get loadState(): ConstraintLoadState {
        return this._loadState
    }

    // Allowed regions to visualize via FoW: the inline geom plus the fetched ones
    get allowedGeometries(): GeoJSONFeature[] {
        const geometries: GeoJSONFeature[] = []
        const inlineGeom = this.coveredByGeomConstraint?.geom
        if (inlineGeom) {
            geometries.push({ type: 'Feature', geometry: inlineGeom, properties: {} })
        }
        geometries.push(...this.boundaryGeometries.values())
        return geometries
    }

    describeConstraints(language: string): AoiConstraintDescription[] {
        return this.constraints.map((constraint): AoiConstraintDescription => {
            switch (constraint.constraint_type) {
                case 'AreaConstraint':
                    return { kind: 'area', minArea: constraint.min_area, maxArea: constraint.max_area, names: [] }
                case 'CoveredByGeomConstraint':
                    return { kind: 'covered-by-geom', names: [constraint.description] }
                case 'CoveredByBoundaryConstraint':
                    return { kind: 'covered-by-boundary', names: this.boundaryNames(constraint.osm_ids, language) }
                case 'BoundarySelectionConstraint':
                    return { kind: 'boundary-selection', names: this.boundaryNames(constraint.osm_ids, language) }
            }
        })
    }

    private boundaryNames(osmIds: number[], language: string): string[] {
        return osmIds
            .map(id => this.boundaryGeometries.get(id))
            .filter(boundary => !!boundary)
            .map(boundary => resolveLocalizedName(boundary.properties, language))
    }

    validate(feature: GeoJSONFeature | undefined): AoiViolation | null {
        if (!feature || !this.hasConstraints) return null

        for (const constraint of this.constraints) {
            const violation = this.validateConstraint(constraint, feature)
            if (violation) return violation
        }
        return null
    }

    private validateConstraint(constraint: AoiConstraint, feature: GeoJSONFeature): AoiViolation | null {
        switch (constraint.constraint_type) {
            case 'AreaConstraint': {
                const area = (feature.properties?.['area'] as number) ?? 0
                if (area < constraint.min_area || area > constraint.max_area) {
                    return { kind: 'area' }
                }
                return null
            }
            case 'CoveredByGeomConstraint': {
                return this.isCoveredWithTolerance(feature.geometry, constraint) ? null : { kind: 'outside-region' }
            }
            case 'CoveredByBoundaryConstraint': {
                if (this._loadState === 'loading') return { kind: 'loading' }
                if (this._loadState === 'error') return { kind: 'load-failed' }
                // The AoI must fit entirely within the union of the boundaries (spanning is fine)
                return this.isCoveredWithTolerance(feature.geometry, constraint) ? null : { kind: 'outside-region' }
            }
            case 'BoundarySelectionConstraint': {
                const featureId = feature.properties?.['id']
                const allowed = constraint.osm_ids.map(String).includes(String(featureId))
                return allowed ? null : { kind: 'not-allowed-boundary' }
            }
        }
    }

    // Dilating the outers is expensive but they are fixed per activation,
    // so compute lazily on the first path check and reuse across validations
    private isCoveredWithTolerance(
        geometry: Geometry,
        constraint: CoveredByGeomConstraint | CoveredByBoundaryConstraint
    ): boolean {
        const inner = geometry as Polygon | MultiPolygon
        const outers =
            constraint.constraint_type === 'CoveredByGeomConstraint'
                ? [constraint.geom]
                : constraint.osm_ids
                      .map(id => this.boundaryGeometries.get(id)?.geometry)
                      .filter(MapGeoJsonUtils.isPolygonal)
        return MapGeoJsonUtils.isCoveredBy(inner, outers, () => {
            let dilated = this.dilatedOutersCache.get(constraint)
            if (!dilated) {
                dilated = MapGeoJsonUtils.dilateForCoverage(outers)
                this.dilatedOutersCache.set(constraint, dilated)
            }
            return dilated
        })
    }

    private fetchBoundaryGeometries(): void {
        const osmIds = [
            ...new Set([
                ...(this.coveredByBoundaryConstraint?.osm_ids ?? []),
                ...(this.boundarySelectionConstraint?.osm_ids ?? [])
            ])
        ]
        if (osmIds.length === 0) {
            this._loadState = 'ready'
            return
        }

        this._loadState = 'loading'
        const requests = osmIds.map(id =>
            this.http
                .get<GeoJSONFeature>(
                    `${environment.heigitMapsUrl}/vector/service/ohsome/ogc/features/v1/collections/admin_world_water/items/${id}`,
                    { headers: { Accept: 'application/geo+json' } }
                )
                .pipe(catchError(() => of(null)))
        )

        this.fetchSubscription = forkJoin(requests).subscribe(features => {
            features.forEach((feature, index) => {
                if (feature?.geometry) {
                    this.boundaryGeometries.set(osmIds[index], feature)
                }
            })
            this.dilatedOutersCache.clear()

            if (this.boundaryGeometries.size === 0) {
                this._loadState = 'error'
            } else {
                if (this.boundaryGeometries.size < osmIds.length) {
                    console.warn('Some AoI constraint boundaries could not be loaded; validating against the subset')
                }
                this._loadState = 'ready'
            }
            this.geometriesChanged$.next()
        })
    }
}
