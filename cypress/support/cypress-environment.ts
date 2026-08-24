/**
 * Environment configuration for Cypress tests
 * This is separate from the application environment to allow for different API paths
 */
export const cypressEnvironment = {
    apiBasePath: 'api/v1/gateway',
    geocodeUrl: 'https://api.heigit.org/pelias/v1',
    cachetUrl: 'https://status.heigit.org'
}
