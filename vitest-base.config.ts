import { defineConfig } from 'vitest/config'

// Set in the main process so every worker pool inherits it (a per-file setup would be pool-dependent).
process.env['TZ'] = 'UTC'

export default defineConfig({
    test: {
        bail: 1,
        coverage: {
            reportsDirectory: 'coverage'
        },
        server: {
            deps: {
                // Inline ngx-papaparse so Vitest applies CommonJS interop to its UMD import.
                inline: ['ngx-papaparse']
            }
        }
    }
})
