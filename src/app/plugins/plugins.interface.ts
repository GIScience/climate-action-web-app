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
        image: 'https://images.unsplash.com/photo-1542621334-a254cf47733d?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        image_source: 'https://unsplash.com/@sxoxm'
    }, {
        enabled: false,
        plugin_id: 'lulc_change_emission_estimation',
        name: 'GHG Emission from LULC Change',
        image: 'https://images.unsplash.com/photo-1436096290837-f876913c5d20?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        image_source: 'https://unsplash.com/@bazylu'
    }, {
        enabled: false,
        plugin_id: 'greenness',
        name: 'Greenness',
        image: 'https://images.unsplash.com/photo-1527690499469-ef2eff9c6735?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        image_source: 'https://unsplash.com/@chuttersnap'
    }, {
        enabled: false,
        plugin_id: 'bikeability',
        name: 'Bikeability',
        image: 'https://images.unsplash.com/photo-1561840884-9dda41ed54e4?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        image_source: 'https://unsplash.com/@waldemarbrandt67w'
    }, {
        enabled: false,
        plugin_id: 'drinking_water',
        name: 'Drinking Water',
        image: 'https://images.unsplash.com/photo-1592103634714-c738838b03c1?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        image_source: 'https://unsplash.com/@dantakesphotos'
    }, {
        enabled: false,
        plugin_id: 'soil_consumption',
        name: 'Soil Consumption',
        image: 'https://images.unsplash.com/photo-1557234195-bd9f290f0e4d?q=80&w=500&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        image_source: 'https://unsplash.com/@synkevych'
    }
] as PluginCard[]