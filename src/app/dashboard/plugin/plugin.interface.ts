import {JSONSchema7} from 'json-schema'
import {Feature} from 'ol'
import {MultiPolygon, Polygon} from 'ol/geom'

export interface PluginAuthor {
    name: string
    affiliation: string
    website: URL
}

export interface Plugin {
    plugin_id: string
    name: string
    icon: string
    authors: Array<PluginAuthor>
    version: string
    concerns: Array<Concern>
    purpose: string
    methodology: string
    sources?: Array<Source>
    operator_schema: JSONSchema7
    library_version: string
    attribution: string
}

export interface Concern {
    concern: 'ghg_emission' | 'mitigation' | 'adaption' | 'waste'
}

export interface Source {
    pages?: string
    volume?: string
    journal?: string
    year?: string
    title?: string
    author?: string
    ENTRYTYPE?: string
    ID?: string,
    note?: string
    url?: string
}

export interface PluginRun {
    correlation_uuid: string,
    pluginId: string,
    pluginName: string,
    status?: RunStatus,
    timestamp: Date,
    aoiName?: string
}

export interface PluginCorrelator {
    correlation_uuid: string
}

export interface ComputeRequest {
    aoi: Feature<Polygon | MultiPolygon>
    params: Record<string, unknown>
}

export type RunStatus = 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'wrong-input'

export type PluginState = 'inactive' | 'compute-ready'