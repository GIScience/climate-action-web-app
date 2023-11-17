export interface Plugin {
    "plugin_id": string,
    "name": string,
    "icon": string,
    "version": string,
    "concerns": Array<Concern>,
    "purpose": string,
    "methodology": string,
    "sources": Array<Source>,
    "operator_schema": {},
    "library_version": string,
    "attribution": string
}

export interface Concern {
    concern: "ghg_emission" | "mitigation" | "adaption" | "waste"
}

export interface Source {
    pages?: string;
    volume?: string;
    journal?: string;
    year?: string;
    title?: string;
    author?: string;
    ENTRYTYPE?: string;
    ID?: string;
}

export interface PluginRun {
    correlation_id: string,
    pluginId: string,
    pluginName: string,
    status?: 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'wrong-input',
}
