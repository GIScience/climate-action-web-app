export interface PluginCard {
    enabled: boolean
    plugin_id: string
    name: string
    image: string
    image_source?: string
    version?: string
    purpose?: string
    library_version?: string

}

export const availableCards = [
    {
        enabled: false,
        plugin_id: 'plugin_blueprint',
        name: 'Plugin Blueprint',
        image: '../../assets/images/plugin-covers/blueprint.jpg',
        image_source: 'https://unsplash.com/@sxoxm'
    }, {
        enabled: false,
        plugin_id: 'lulc_change_emission_estimation',
        name: 'GHG Emission from LULC Change',
        image: '../../assets/images/plugin-covers/ghg-lulc.jpg',
        image_source: 'https://unsplash.com/@bazylu'
    }, {
        enabled: false,
        plugin_id: 'greenness',
        name: 'Greenness',
        image: '../../assets/images/plugin-covers/greenness.jpg',
        image_source: 'https://unsplash.com/@chuttersnap'
    }, {
        enabled: false,
        plugin_id: 'bikeability',
        name: 'Bikeability',
        image: '../../assets/images/plugin-covers/bikeability.jpg',
        image_source: 'https://unsplash.com/@waldemarbrandt67w'
    }, {
        enabled: false,
        plugin_id: 'drinking_water',
        name: 'Drinking Water',
        image: '../../assets/images/plugin-covers/drinking-water.jpg',
        image_source: 'https://unsplash.com/@dantakesphotos'
    }, {
        enabled: false,
        plugin_id: 'soil_consumption',
        name: 'Soil Consumption',
        image: '../../assets/images/plugin-covers/soil-consumption.jpg',
        image_source: 'https://unsplash.com/@synkevych'
    },{
        enabled: false,
        plugin_id: 'walkability',
        name: 'Walkability',
        image: '../../assets/images/plugin-covers/walkability.jpg',
        image_source: 'https://unsplash.com/@paulmelki'
    }
] as PluginCard[]