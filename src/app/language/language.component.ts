import { Component, inject } from '@angular/core'
import { DateAdapter } from '@angular/material/core'
import { TranslocoService } from '@jsverse/transloco'
import { Languages, LucideAngularModule } from 'lucide-angular'
import { DropdownMenuDirective } from '../shared/dropdown-menu.directive'
import { StorageService } from '../storage.service'
import { SupportedLanguage } from '../types/language.types'
import { getDateFnsLocale, updateActiveDateFnsLocale } from '../utils/locale.utils'

@Component({
    selector: 'app-language',
    imports: [LucideAngularModule, DropdownMenuDirective],
    templateUrl: './language.component.html',
    styleUrl: './language.component.scss'
})
export class LanguageComponent {
    private translocoService = inject(TranslocoService)
    private storageService = inject(StorageService)
    private dateAdapter = inject(DateAdapter)

    currentLang: SupportedLanguage
    languageMenuOpen = false
    readonly supportedLanguages = SupportedLanguage
    readonly Languages = Languages

    constructor() {
        const storedPreference = this.storageService.getLanguagePreference()
        const activeLanguage = this.translocoService.getActiveLang() as SupportedLanguage

        this.currentLang = storedPreference ?? activeLanguage

        if (!storedPreference) {
            this.storageService.saveLanguagePreference(this.currentLang)
        }
    }

    toggleLanguageMenu() {
        this.languageMenuOpen = !this.languageMenuOpen
    }

    selectLanguage(lang: SupportedLanguage) {
        if (lang === this.currentLang) {
            this.languageMenuOpen = false
            return
        }

        this.translocoService.setActiveLang(lang)
        this.storageService.saveLanguagePreference(lang)
        updateActiveDateFnsLocale(lang)
        this.dateAdapter.setLocale(getDateFnsLocale(lang))
        this.currentLang = lang
        this.languageMenuOpen = false
    }

    closeLanguageMenu() {
        this.languageMenuOpen = false
    }

    getLanguageLabel(language: SupportedLanguage): string {
        const displayNames = new Intl.DisplayNames([language], { type: 'language' })
        return displayNames.of(language) ?? language
    }
}
