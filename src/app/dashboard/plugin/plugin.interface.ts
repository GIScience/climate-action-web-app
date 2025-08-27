import { Source } from '@app/types/sources/sources.type'
import { JSONSchema7 } from 'json-schema'
import { GeoJSONFeature } from 'ol/format/GeoJSON'
import { MultiPolygon } from 'ol/geom'

export interface PluginAuthor {
    name: string
    affiliation?: string
    website: URL
}

export interface PluginAssets {
    icon: string
}

export interface Plugin {
    name: string
    authors: Array<PluginAuthor>
    version: string
    concerns: Array<Concern>
    teaser: string
    purpose: string
    methodology: string
    sources: Array<Source> | null
    demo_config: DemoConfig | null
    assets: PluginAssets
    plugin_id: string
    operator_schema: JSONSchema7
    library_version: string
    status?: 'active' | 'unavailable' | 'releasing-soon'
    state?: 'experimental' | 'active' | 'hibernate' | 'archive' // Development state
}

export interface PluginBaseInfo {
    plugin_id: string
    plugin_version: string
}

export interface Concern {
    concern: 'ghg_emission' | 'mitigation' | 'adaption' | 'pedestrian' | 'cycling' | 'waste'
}

export interface ComputeRequest {
    aoi: GeoJSONFeature
    params: Record<string, unknown>
}

export interface DemoConfig {
    aoi: MultiPolygon
    params: Record<string, unknown>
}

export type ComputeState = 'inactive' | 'compute-ready'
