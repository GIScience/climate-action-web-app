import {Plugin} from '../plugin/plugin.interface'

export interface PluginCard extends Pick<Plugin, 'name' | 'version' | 'purpose' | 'plugin_id' | 'library_version'> {
    enabled: boolean
    icon: string // Keep as string to allow for relative paths for overriden icons
    icon_credit?: string
}

export const availableCards = [
    {
        plugin_id: 'lulc_change_emission_estimation',
        name: 'GHG Emission from LULC Change',
        icon: 'assets/images/plugin-icons/ghg-lulc.jpg',
        icon_credit: 'https://unsplash.com/@bazylu'
    }, {
        plugin_id: 'greenness',
        name: 'Greenness',
        icon: 'assets/images/plugin-icons/greenness.jpg',
        icon_credit: 'https://unsplash.com/@chuttersnap'
    }, {
        plugin_id: 'bikeability',
        name: 'Bikeability',
        icon: 'assets/images/plugin-icons/bikeability.jpg',
        icon_credit: 'https://unsplash.com/@waldemarbrandt67w'
    }, {
        plugin_id: 'drinking_water',
        name: 'Drinking Water',
        icon: 'assets/images/plugin-icons/drinking-water.jpg',
        icon_credit: 'https://unsplash.com/@dantakesphotos'
    }, {
        plugin_id: 'land_consumption',
        name: 'Land Consumption',
        icon: 'assets/images/plugin-icons/land-consumption.jpg',
        icon_credit: 'https://unsplash.com/@synkevych'
    },{
        plugin_id: 'walkability',
        name: 'Walkability',
        icon: 'assets/images/plugin-icons/walkability.jpg',
        icon_credit: 'https://unsplash.com/@paulmelki'
    }
] as PluginCard[]