import { ComputationParameters } from './computation.interface'

export function formatParameterName(name: string): string {
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

export function formatParameterValue(value: unknown): string {
    if (value === null || value === undefined) {
        return ''
    }
    if (Array.isArray(value)) {
        return value.map(v => formatParameterValue(v)).join(', ')
    }
    switch (typeof value) {
        case 'boolean':
            return value ? 'Yes' : 'No'
        case 'object':
            return Object.entries(value as Record<string, unknown>)
                .map(([k, v]) => `${formatParameterName(k)}: ${formatParameterValue(v)}`)
                .join('; ')
        default:
            return String(value)
    }
}

export function getParameterEntries(params: string | object | null | undefined): { key: string; value: string }[] {
    if (!params) return []
    const obj = typeof params === 'string' ? JSON.parse(params) : params
    if (!obj || typeof obj !== 'object') return []
    return Object.entries(obj).map(([key, value]) => ({
        key,
        value: formatParameterValue(value)
    }))
}

export function isUserRequestedParam(key: string, requestedParams?: ComputationParameters): boolean {
    return !!requestedParams && key in requestedParams
}

export function hasUserRequestedParams(
    params?: ComputationParameters,
    requestedParams?: ComputationParameters
): boolean {
    if (!params || !requestedParams) return false
    return Object.keys(params).some(key => key in requestedParams)
}
