import { defineConfig } from 'cypress'
import { configureVisualRegression } from 'cypress-visual-regression'

export default defineConfig({
    viewportWidth: 1500,
    viewportHeight: 850,
    experimentalMemoryManagement: true,
    retries: {
        runMode: 2,
        openMode: 0
    },
    e2e: {
        baseUrl: 'http://localhost:4200',
        env: {
            visualRegressionType: 'regression'
        },
        screenshotsFolder: './cypress/snapshots/actual',
        setupNodeEvents(on, config) {
            configureVisualRegression(on)
            on('before:browser:launch', (browser, launchOptions) => {
                if (browser.name === 'chrome' || browser.name === 'chromium') {
                    // Disable GPU and set consistent rendering
                    launchOptions.args.push(
                        '--disable-gpu',
                        '--disable-dev-shm-usage',
                        '--disable-blink-features=AutomationControlled',
                        '--force-device-scale-factor=1',
                        '--force-color-profile=srgb',
                        '--font-render-hinting=none'
                    )

                    if (browser.isHeadless) {
                        // Use larger window size to ensure viewport fits
                        launchOptions.args.push('--headless', '--window-size=1600,950')
                    }
                }

                return launchOptions
            })
            return config
        }
    }
})
