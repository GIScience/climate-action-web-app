import { SupportedLanguage } from '../types/language.types'

// Whether a language should fall back to English before using the local name
const USES_ENGLISH_FALLBACK: ReadonlySet<SupportedLanguage> = new Set([SupportedLanguage.DE])

export function resolveLocalizedName(
    properties: Record<string, unknown> | null | undefined,
    language: string,
    defaultValue = 'Unnamed Region'
): string {
    if (!properties) return defaultValue

    const langKey = `name_${language}`
    if (properties[langKey]) return properties[langKey] as string

    if (USES_ENGLISH_FALLBACK.has(language as SupportedLanguage) && properties['name_en']) {
        return properties['name_en'] as string
    }

    return (properties['name'] as string) || defaultValue
}
