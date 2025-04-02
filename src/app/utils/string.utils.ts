//TODO: Converts a plugin ID (e.g. 'carbon_footprint_calculator') to a display name (e.g. 'Carbon Footprint Calculator'), to be removed when API is updated
export function derivePluginNameFromId(pluginName: string): string {
    return pluginName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}
