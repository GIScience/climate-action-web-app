export interface Environment {
    environmentType: EnvironmentType
    climateActionApiUrl: string
    orsAPIKey: string
    appwriteProjectId: string
    appwriteEndpoint: string
    appwriteWebsiteUrl: string
    appwriteRunsCollectionId: string
    npointDocId: string
}

export type EnvironmentType = 'testing' | 'development' | 'staging' | 'production'

declare global {
    interface Window {
        env?: {
            ENVIRONMENT_TYPE?: EnvironmentType
            CLIMATE_ACTION_API_URL?: string
            ORS_API_KEY?: string
            APPWRITE_PROJECT_ID?: string
            APPWRITE_ENDPOINT?: string
            APPWRITE_WEBSITE_URL?: string
            APPWRITE_RUNS_COLLECTION_ID?: string
            NPOINT_DOC_ID?: string
        }
    }
}
