import { Plugin } from '../plugin/plugin.interface'

export interface PluginCard extends Pick<Plugin, 'id' | 'name' | 'teaser' | 'online' | 'concerns'> {
    icon: string // Keep as string to allow for relative paths for overriden icons
}
