import type { Config } from 'jest'

const config: Config = {
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/cypress/', '<rootDir>/.cache/'],
    coverageReporters: ['html', 'text-summary', 'cobertura', 'lcov'],
    coverageDirectory: 'coverage',
    cache: true,
    cacheDirectory: '<rootDir>/.jest-cache',

    moduleNameMapper: {
        '^@app/(.*)$': '<rootDir>/src/app/$1',
        '^@environments/(.*)$': '<rootDir>/src/environments/$1',
        '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
        '^src/environments/environment$': '<rootDir>/src/environments/environment.ts'
    },

    transformIgnorePatterns: [
        'node_modules/(?!(.*\\.pnpm/.*/node_modules/)?(ol|quick-lru|geotiff|color-space|color-name|color-rgba|color-parse|@angular|@ngneat|@jsverse|rxjs|@kurkle|chart\\.js|ngx-scrollbar|ngx-papaparse|ng2-charts|lodash-es|lucide-angular|@ngx-formly|ngx-markdown|ngx-toastr|marked|rbush|quickselect))'
    ],

    transform: {
        '^.+\\.(ts|js|mjs|html)$': [
            'jest-preset-angular',
            {
                tsconfig: '<rootDir>/tsconfig.spec.json',
                stringifyContentPathRegex: '\\.html$'
            }
        ]
    },

    maxWorkers: '50%'
}

export default config
