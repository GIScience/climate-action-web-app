// Fallback: converts a plugin ID (e.g. 'plugin_blueprint') to a display name (e.g. 'Plugin Blueprint')
// Used by PluginService.getPluginNameById() when the plugin name cache is not yet populated
export function derivePluginNameFromId(pluginName: string): string {
    return pluginName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}
