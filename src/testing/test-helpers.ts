import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco'
import { Subject } from 'rxjs'
import { vi } from 'vitest'

export class MockToastrService {
    success = vi.fn(() => ({ onTap: new Subject<void>() }))
    error = vi.fn()
    warning = vi.fn()
    info = vi.fn()
    show = vi.fn()
    clear = vi.fn()
    remove = vi.fn()
    toastrConfig = {
        positionClass: 'toast-bottom-center',
        preventDuplicates: true,
        maxOpened: 10,
        easeTime: 100,
        autoDismiss: true,
        extendedTimeOut: 2000,
        progressBar: true,
        closeButton: true
    }
}

// Shared Transloco testing setup — pass options to override langs/config for a specific spec
export function getTranslocoTestingModule(options: TranslocoTestingOptions = {}) {
    return TranslocoTestingModule.forRoot({
        langs: { en: {}, de: {} },
        translocoConfig: { defaultLang: 'en' },
        ...options
    })
}
