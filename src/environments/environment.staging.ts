import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_WEBSITE_URL, ORS_API_KEY } from './keys-and-ids/keys-and-ids'

export const environment = {
    production: false,
    environmentType: 'staging',
    climateActionApiUrl: 'https://staging.api.heigit.org/climate-action-platform',
    climateActionWSUrl: 'wss://staging.climate-action.heigit.org',
    orsAPIKey: ORS_API_KEY,
    appwriteProjectId: APPWRITE_PROJECT_ID,
    appwriteEndpoint: APPWRITE_ENDPOINT,
    appwriteWebsiteUrl: APPWRITE_WEBSITE_URL
}
