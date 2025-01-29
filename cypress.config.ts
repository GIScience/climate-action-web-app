import { defineConfig } from 'cypress'
import { configureVisualRegression } from 'cypress-visual-regression'

export default defineConfig({
    viewportWidth: 1500,
    viewportHeight: 850,
    e2e: {
        baseUrl: 'http://localhost:4200',
        env: {
            visualRegressionType: 'regression'
        },
        screenshotsFolder: './cypress/snapshots/actual',
        setupNodeEvents(on, config) {
            configureVisualRegression(on)
            on('before:browser:launch', (browser, launchOptions) => {
                if (browser.name === 'chrome' && browser.isHeadless) {
                    launchOptions.args.push(
                        '--window-size=1500,850 --start-fullscreen --force-color-profile=srgb --font-render-hinting=none'
                    )
                }

                return launchOptions
            })
            return config
        }
    }
})
