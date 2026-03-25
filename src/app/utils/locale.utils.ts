import { Locale } from 'date-fns'
import { de, enGB } from 'date-fns/locale'
import { SupportedLanguage } from '../types/language.types'

export const DATE_FNS_LOCALES: Record<SupportedLanguage, Locale> = {
    [SupportedLanguage.EN]: enGB,
    [SupportedLanguage.DE]: de
}

export function getDateFnsLocale(lang: string): Locale {
    return DATE_FNS_LOCALES[lang as SupportedLanguage] ?? enGB
}

//  A proxy locale that always delegates to the current active locale.
//  Needed because DateFnsAdapter captures MAT_DATE_LOCALE at construction
//  and never updates its internal reference on setLocale().
let _activeDateFnsLocale: Locale = enGB

export const reactiveDateFnsLocale: Locale = new Proxy({} as Locale, {
    get: (_target, prop: string | symbol) => Reflect.get(_activeDateFnsLocale, prop)
})

export function updateActiveDateFnsLocale(lang: string): void {
    _activeDateFnsLocale = getDateFnsLocale(lang)
}
