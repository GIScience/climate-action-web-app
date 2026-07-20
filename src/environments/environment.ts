import { Environment } from '../types/environment'

export const environment: Environment = {
    environmentType: window.env?.ENVIRONMENT_TYPE || 'production',
    climateActionApiUrl: window.env?.CLIMATE_ACTION_API_URL || 'http://localhost/api/v1/gateway',
    geocodeUrl: window.env?.GEOCODE_URL || 'https://api.heigit.org/pelias/v1',
    geocodeAPIKey: window.env?.GEOCODE_API_KEY || '',
    heigitMapsUrl: window.env?.HEIGIT_MAPS_URL || 'https://maps.heigit.org',
    appwriteProjectId: window.env?.APPWRITE_PROJECT_ID || '',
    appwriteEndpoint: window.env?.APPWRITE_ENDPOINT || 'https://staging.api.account.heigit.org',
    appwriteWebsiteUrl: window.env?.APPWRITE_WEBSITE_URL || 'https://staging.account.heigit.org',
    appwriteRunsCollectionId: window.env?.APPWRITE_RUNS_COLLECTION_ID || 'staging-dashboard_data',
    cachetUrl: window.env?.CACHET_URL || 'https://status.heigit.org',
    cachetWatchedComponents: window.env?.CACHET_WATCHED_COMPONENTS || 'Climate Action: Climate Action Navigator',
    scheduleLookaheadDays: window.env?.SCHEDULE_LOOKAHEAD_DAYS || '7',
    fallbackSchedulesUrl: window.env?.FALLBACK_SCHEDULES_URL || ''
}
