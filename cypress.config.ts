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
                    launchOptions.preferences['default'].intl = { accept_languages: 'en' }
                    launchOptions.args.push(
                        '--disable-dev-shm-usage',
                        '--disable-blink-features=AutomationControlled',
                        '--force-device-scale-factor=1',
                        '--force-color-profile=srgb',
                        '--font-render-hinting=none'
                    )

                    if (browser.isHeadless) {
                        launchOptions.args.push(
                            '--headless',
                            '--window-size=1600,950',
                            '--use-gl=swiftshader',
                            '--ignore-gpu-blocklist',
                            '--enable-unsafe-swiftshader'
                        )
                    }
                }

                return launchOptions
            })
            return config
        }
    }
})
