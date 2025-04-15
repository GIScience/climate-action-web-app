import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_WEBSITE_URL, ORS_API_KEY } from './keys-and-ids/keys-and-ids'

export const environment = {
    production: true,
    climateActionApiUrl: 'https://climate-action.heigit.org',
    climateActionWSUrl: 'wss://climate-action.heigit.org',
    orsAPIKey: ORS_API_KEY,
    appwriteProjectId: APPWRITE_PROJECT_ID,
    appwriteEndpoint: APPWRITE_ENDPOINT,
    appwriteWebsiteUrl: APPWRITE_WEBSITE_URL
}
