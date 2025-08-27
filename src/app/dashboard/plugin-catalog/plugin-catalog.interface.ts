import { Plugin } from '../plugin/plugin.interface'

export interface PluginCard
    extends Pick<Plugin, 'name' | 'version' | 'teaser' | 'plugin_id' | 'library_version' | 'status'> {
    icon: string // Keep as string to allow for relative paths for overriden icons
    icon_credit?: string
}
