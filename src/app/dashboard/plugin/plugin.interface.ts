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
    status?: 'active' | 'unavailable' | 'releasing-soon'
}

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
