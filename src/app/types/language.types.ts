export enum SupportedLanguage {
    EN = 'en',
    DE = 'de'
}

export const SUPPORTED_LANGUAGES = Object.values(SupportedLanguage) as ReadonlyArray<SupportedLanguage>

export function isValidLanguage(lang: string): lang is SupportedLanguage {
    return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}
