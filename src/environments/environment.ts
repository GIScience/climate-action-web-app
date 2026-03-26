import { Environment } from '../types/environment'

export const environment: Environment = {
    environmentType: window.env?.ENVIRONMENT_TYPE || 'production',
    climateActionApiUrl: window.env?.CLIMATE_ACTION_API_URL || 'http://localhost/api/v1/gateway',
    orsAPIKey: window.env?.ORS_API_KEY || '',
    appwriteProjectId: window.env?.APPWRITE_PROJECT_ID || '',
    appwriteEndpoint: window.env?.APPWRITE_ENDPOINT || 'https://staging.api.account.heigit.org',
    appwriteWebsiteUrl: window.env?.APPWRITE_WEBSITE_URL || 'https://staging.account.heigit.org',
    appwriteRunsCollectionId: window.env?.APPWRITE_RUNS_COLLECTION_ID || 'staging-dashboard_data',
    npointDocId: window.env?.NPOINT_DOC_ID || ''
}
