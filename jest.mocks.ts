import '@angular/compiler'
import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco'
import { setImmediate as nodeSetImmediate } from 'node:timers'
import { Subject } from 'rxjs'

// Mock browser APIs that might not be available in test environment

// jest's jsdom environment has no setImmediate, which fake-indexeddb relies on.
// Provide Node's real one. Specs that use fake timers must leave it unfaked
// (see `doNotFake` in run-sync.service.spec.ts).
if (typeof globalThis.setImmediate === 'undefined') {
    globalThis.setImmediate = nodeSetImmediate as unknown as typeof setImmediate
}

// Mock URL.createObjectURL used by Plotly Maps
if (typeof window !== 'undefined') {
    window.URL.createObjectURL = () => ''
    window.URL.revokeObjectURL = () => {}
}

// Export the mock class for manual use if needed
export class MockToastrService {
    success = jest.fn(() => ({ onTap: new Subject<void>() }))
    error = jest.fn()
    warning = jest.fn()
    info = jest.fn()
    show = jest.fn()
    clear = jest.fn()
    remove = jest.fn()
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

const originalConsoleError = console.error
console.error = (...args: any[]) => {
    const fullMessage = args.map(arg => arg?.toString?.() || arg?.message || '').join(' ')

    if (fullMessage.includes('URL.createObjectURL')) {
        return
    }
    if (fullMessage.includes('HTMLCanvasElement.prototype.getContext')) {
        return
    }
    if (fullMessage.includes('Not implemented: HTMLCanvasElement')) {
        return
    }
    if (fullMessage.includes('without installing the canvas npm package')) {
        return
    }
    if (fullMessage.includes('Error fetching plugins')) {
        return
    }
    if (fullMessage.includes('Plugin null does not exist')) {
        return
    }
    if (fullMessage.includes('Unsupported vector file format')) {
        return
    }
    if (fullMessage.includes('File could not be loaded due to')) {
        return
    }
    if (fullMessage.includes('Error fetching computation metadata for')) {
        return
    }
    if (fullMessage.includes('Error loading computation:')) {
        return
    }
    originalConsoleError.apply(console, args)
}
