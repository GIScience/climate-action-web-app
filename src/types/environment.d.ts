export interface Environment {
    environmentType: EnvironmentType
    climateActionApiUrl: string
    climateActionWSUrl: string
    orsAPIKey: string
    appwriteProjectId: string
    appwriteEndpoint: string
    appwriteWebsiteUrl: string
}

export type EnvironmentType = 'testing' | 'development' | 'staging' | 'production'
