import {
    formatParameterName,
    formatParameterValue,
    getParameterEntries,
    hasUserRequestedParams,
    isUserRequestedParam
} from './computation-parameter.utils'

describe('computation-parameter.utils', () => {
    describe('formatParameterName', () => {
        it('should title-case snake_case names', () => {
            expect(formatParameterName('max_value')).toBe('Max Value')
            expect(formatParameterName('enabled')).toBe('Enabled')
        })
    })

    describe('getParameterEntries', () => {
        it('should format values and handle nested structures', () => {
            const entries = getParameterEntries({
                enabled: true,
                names: ['alpha', 'beta'],
                config: { max_value: 3 }
            })

            expect(entries).toEqual([
                { key: 'enabled', value: 'Yes' },
                { key: 'names', value: 'alpha, beta' },
                { key: 'config', value: 'Max Value: 3' }
            ])
        })

        it('should parse JSON string params', () => {
            expect(getParameterEntries('{"threshold": 0.5}')).toEqual([{ key: 'threshold', value: '0.5' }])
        })

        it('should return no entries for missing params', () => {
            expect(getParameterEntries(null)).toEqual([])
            expect(getParameterEntries(undefined)).toEqual([])
        })
    })

    describe('formatParameterValue', () => {
        it('should render booleans as Yes/No and nullish values as empty', () => {
            expect(formatParameterValue(false)).toBe('No')
            expect(formatParameterValue(null)).toBe('')
            expect(formatParameterValue(undefined)).toBe('')
        })

        it('should join object entries with formatted keys', () => {
            expect(formatParameterValue({ min_value: 1, max_value: 3 })).toBe('Min Value: 1; Max Value: 3')
        })
    })

    describe('requested param helpers', () => {
        it('should detect requested params', () => {
            const params = { foo: 1, bar: 2 }
            const requested = { bar: 2 }

            expect(hasUserRequestedParams(params, requested)).toBe(true)
            expect(isUserRequestedParam('bar', requested)).toBe(true)
            expect(isUserRequestedParam('foo', requested)).toBe(false)
        })

        it('should report no requested params when either side is missing', () => {
            expect(hasUserRequestedParams({ foo: 1 }, undefined)).toBe(false)
            expect(hasUserRequestedParams(undefined, { foo: 1 })).toBe(false)
            expect(isUserRequestedParam('foo', undefined)).toBe(false)
        })
    })
})
