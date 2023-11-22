export interface PluginParametersSchema {
    required: string[]
    properties: PluginPropertiesSchema[]
    $defs: string
}

export interface PluginPropertiesSchema {
    default: boolean | string | number
    examples: [boolean] | [string] | [number] | [{ geometry: { coordinates: [[number[][]]], type: string }, type: string, properties: unknown }]
    description: string
    title: string
    type: string
    anyOf?: [PluginPropertiesSchema],
    allOf?: [PluginPropertiesSchema],
    exclusiveMaximum?: number | string
    exclusiveMinimum?: number | string
    Maximum?: number | string
    Minimum?: number | string
    $ref?: string
    format?: string
    enum?: string
    items?: { $ref?: string }
}
