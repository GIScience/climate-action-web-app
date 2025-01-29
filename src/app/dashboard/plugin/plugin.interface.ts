import { JSONSchema7 } from 'json-schema'
import { Feature } from 'ol'
import { MultiPolygon } from 'ol/geom'
import { Source } from '../../types/sources/sources.type'

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
    purpose: string
    methodology: string
    sources?: Array<Source>
    assets: PluginAssets
    plugin_id: string
    operator_schema: JSONSchema7
    library_version: string
    status?: 'active' | 'unavailable' | 'releasing-soon'
}

export interface PluginBaseInfo {
    plugin_id: string
    plugin_version: string
}

export interface Concern {
    concern: 'ghg_emission' | 'mitigation' | 'adaption' | 'pedestrian' | 'cycling' | 'waste'
}

export interface ComputeRequest {
    aoi: Feature<MultiPolygon>
    params: Record<string, unknown>
}

export type ComputeState = 'inactive' | 'compute-ready'
