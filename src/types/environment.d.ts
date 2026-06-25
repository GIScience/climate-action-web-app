export interface Environment {
    environmentType: EnvironmentType
    climateActionApiUrl: string
    geocodeUrl: string
    geocodeAPIKey: string
    heigitMapsUrl: string
    appwriteProjectId: string
    appwriteEndpoint: string
    appwriteWebsiteUrl: string
    appwriteRunsCollectionId: string
    cachetUrl: string
    cachetWatchedComponents: string
    scheduleLookaheadDays: string
}

export type EnvironmentType = 'testing' | 'development' | 'staging' | 'production'

declare global {
    interface Window {
        env?: {
            ENVIRONMENT_TYPE?: EnvironmentType
            CLIMATE_ACTION_API_URL?: string
            GEOCODE_URL?: string
            GEOCODE_API_KEY?: string
            HEIGIT_MAPS_URL?: string
            APPWRITE_PROJECT_ID?: string
            APPWRITE_ENDPOINT?: string
            APPWRITE_WEBSITE_URL?: string
            APPWRITE_RUNS_COLLECTION_ID?: string
            CACHET_URL?: string
            CACHET_WATCHED_COMPONENTS?: string
            SCHEDULE_LOOKAHEAD_DAYS?: string
        }
    }
}
