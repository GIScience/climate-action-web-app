import { SupportedLanguage } from '@app/types/language.types'
import { Source } from '@app/types/sources/sources.type'
import type { Feature as GeoJSONFeature, MultiPolygon } from 'geojson'
import { JSONSchema7 } from 'json-schema'

export interface PluginAuthor {
    name: string
    affiliation?: string
    website: URL
}

export interface PluginAssets {
    icon: string
}

export interface Plugin {
    id: string
    version: string
    name: string
    authors: Array<PluginAuthor>
    state?: 'experimental' | 'active' | 'hibernate' | 'archive' // Development state
    concerns: Array<Concern>
    teaser: string
    repository: string
    purpose: string
    methodology: string
    sources: Array<Source> | null
    assets: PluginAssets
    operator_schema: JSONSchema7
    demo_config: DemoConfig | null
    library_version: string
    language?: SupportedLanguage
    status?: 'active' | 'unavailable' | 'releasing-soon'
    online: boolean
    aoi_constraints?: AoiConstraint[][] // Outer array = OR alternatives, inner array = AND conditions. Currently only the first group is enforced.
}

export interface AreaConstraint {
    constraint_type: 'AreaConstraint'
    min_area: number // km²
    max_area: number // km²
}

export interface CoveredByGeomConstraint {
    constraint_type: 'CoveredByGeomConstraint'
    geom: MultiPolygon
    description: string
}

export interface CoveredByBoundaryConstraint {
    constraint_type: 'CoveredByBoundaryConstraint'
    osm_ids: number[]
}

export interface BoundarySelectionConstraint {
    constraint_type: 'BoundarySelectionConstraint'
    osm_ids: number[]
}

export type AoiConstraint =
    AreaConstraint | CoveredByGeomConstraint | CoveredByBoundaryConstraint | BoundarySelectionConstraint

export type PluginBaseInfo = Pick<Plugin, 'id' | 'version'>

export interface Concern {
    concern: 'ghg_emission' | 'mitigation' | 'adaption' | 'pedestrian' | 'cycling' | 'waste'
}

export interface ComputeRequest {
    aoi: GeoJSONFeature
    params: Record<string, unknown>
}

export interface DemoConfig {
    aoi: MultiPolygon
    name?: string
    params: Record<string, unknown>
}

export type ComputeState = 'inactive' | 'compute-ready'

export enum ExternalInput {
    Boundary = 'boundary',
    File = 'file'
}
export enum DrawInput {
    Circle = 'circle',
    Box = 'rectangle',
    Polygon = 'polygon'
}
export type GeometryInputMode = ExternalInput | DrawInput
