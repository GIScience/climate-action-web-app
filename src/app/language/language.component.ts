import { Component, inject } from '@angular/core'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import { Languages, LucideAngularModule } from 'lucide-angular'
import { ToastrService } from 'ngx-toastr'
import { take } from 'rxjs'
import { StorageService } from '../storage.service'
import { SupportedLanguage } from '../types/language.types'

@Component({
    selector: 'app-language',
    imports: [TranslocoModule, LucideAngularModule],
    templateUrl: './language.component.html',
    styleUrl: './language.component.scss'
})
export class LanguageComponent {
    private translocoService = inject(TranslocoService)
    private storageService = inject(StorageService)
    private toastr = inject(ToastrService)

    currentLang: SupportedLanguage
    private lastPersistedLanguage: SupportedLanguage | null = null
    languageMenuOpen = false
    private closeTimeout: ReturnType<typeof setTimeout> | null = null
    readonly supportedLanguages = SupportedLanguage
    readonly Languages = Languages

    constructor() {
        const storedPreference = this.storageService.getLanguagePreference()
        const activeLanguage = this.translocoService.getActiveLang() as SupportedLanguage

        this.currentLang = storedPreference ?? activeLanguage
        this.lastPersistedLanguage = storedPreference

        if (!storedPreference) {
            this.storageService.saveLanguagePreference(this.currentLang)
            this.lastPersistedLanguage = this.currentLang

            if (this.currentLang === SupportedLanguage.DE) {
                this.showGermanWarning()
            }
        }
    }

    toggleLanguageMenu() {
        this.languageMenuOpen = !this.languageMenuOpen
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout)
            this.closeTimeout = null
        }
    }

    selectLanguage(lang: SupportedLanguage) {
        if (lang === this.currentLang) {
            this.languageMenuOpen = false
            return
        }

        const previouslyPersisted = this.lastPersistedLanguage

        this.translocoService.setActiveLang(lang)
        this.storageService.saveLanguagePreference(lang)
        this.currentLang = lang
        this.lastPersistedLanguage = lang
        this.languageMenuOpen = false

        if (lang === SupportedLanguage.DE && previouslyPersisted !== SupportedLanguage.DE) {
            this.showGermanWarning()
        }
    }

    closeLanguageMenu() {
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout)
        }
        this.closeTimeout = setTimeout(() => {
            this.languageMenuOpen = false
            this.closeTimeout = null
        }, 500)
    }

    cancelLanguageMenuClose() {
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout)
            this.closeTimeout = null
        }
    }

    private showGermanWarning() {
        this.translocoService
            .selectTranslate('app.language.otherLangComputationWarning')
            .pipe(take(1))
            .subscribe(message => {
                this.toastr.info(message, '', { disableTimeOut: true })
            })
    }
}
