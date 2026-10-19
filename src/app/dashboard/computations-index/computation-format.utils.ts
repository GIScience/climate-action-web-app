import { SupportedLanguage } from '@app/types/language.types'
import { getDateFnsLocale } from '@app/utils/locale.utils'
import { TranslocoService } from '@jsverse/transloco'
import { format } from 'date-fns'
import { ComputationDisplayEntity } from './computation.interface'

export function formatComputationTimestamp(timestamp: Date | string, lang: string): string {
    const date =
        typeof timestamp === 'string'
            ? new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(timestamp) ? timestamp : timestamp + 'Z')
            : timestamp
    return format(date, getDatePattern(lang), { locale: getDateFnsLocale(lang) })
}

function getDatePattern(lang: string): string {
    switch (lang) {
        case SupportedLanguage.DE:
            return 'd. MMM yyyy, HH:mm'
        default:
            return 'd MMM yyyy, h:mm a'
    }
}

export function formatShortUUID(correlation_uuid: string): string {
    return correlation_uuid.substring(0, 8)
}

export function getLanguageMismatchTooltip(
    computation: Pick<ComputationDisplayEntity, 'language'>,
    pluginLanguage: SupportedLanguage,
    translocoService: TranslocoService
): string | null {
    const computationLanguage = computation.language ?? SupportedLanguage.EN
    const currentLanguage = translocoService.getActiveLang() as SupportedLanguage

    if (computationLanguage === currentLanguage) {
        return null
    }

    const getLanguageLabel = (language: SupportedLanguage): string => {
        const displayNames = new Intl.DisplayNames([currentLanguage], { type: 'language' })
        return displayNames.of(language) ?? language
    }

    const translationKey =
        pluginLanguage === currentLanguage
            ? 'computationsIndex.languageMismatch'
            : 'computationsIndex.languageMismatchPluginOnly'

    return translocoService.translate(translationKey, {
        language: getLanguageLabel(computationLanguage),
        currentLanguage: getLanguageLabel(currentLanguage),
        pluginLanguage: getLanguageLabel(pluginLanguage)
    })
}
