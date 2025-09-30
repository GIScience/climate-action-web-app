export interface Environment {
    environmentType: EnvironmentType
    climateActionApiUrl: string
    orsAPIKey: string
    appwriteProjectId: string
    appwriteEndpoint: string
    appwriteWebsiteUrl: string
}

export type EnvironmentType = 'testing' | 'development' | 'staging' | 'production'

declare global {
    interface Window {
        env?: {
            CLIMATE_ACTION_API_URL?: string
            ENVIRONMENT_TYPE?: EnvironmentType
            ORS_API_KEY?: string
            APPWRITE_PROJECT_ID?: string
            APPWRITE_ENDPOINT?: string
            APPWRITE_WEBSITE_URL?: string
        }
    }
}
