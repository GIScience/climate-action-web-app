/**
 * Global setup for the unit tests (`ng test`, Vitest runner).
 * The Angular runner initialises zone.js and the TestBed before this file runs.
 */
// Runs every describe/it/hook inside zone.js's ProxyZone so fakeAsync() works under vitest.
// zone.js/testing itself is loaded by the runner as a polyfill; this patch is a separate entry.
import { IDBFactory } from 'fake-indexeddb'
import 'fake-indexeddb/auto'
import { vi } from 'vitest'
import 'zone.js/plugins/vitest-patch'

// Spec files share a worker and fake-indexeddb is a cached module, so without this a database
// written by one spec file (e.g. persisted runs) is still there for the next one.
globalThis.indexedDB = new IDBFactory()

// jsdom does not implement URL.createObjectURL (used by Plotly maps)
window.URL.createObjectURL = () => ''
window.URL.revokeObjectURL = () => {}

if (!('locks' in navigator)) {
    Object.defineProperty(navigator, 'locks', {
        value: {
            request: async (name: string, optionsOrCallback: unknown, grantedCallback?: unknown) => {
                const callback = (grantedCallback ?? optionsOrCallback) as (lock: Lock) => Promise<unknown>
                return callback({ name, mode: 'exclusive' })
            }
        }
    })
}

// Unit tests never hit the network (the Appwrite SDK calls fetch on startup)
globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    url: '',
    redirected: false,
    type: 'basic',
    headers: new Headers(),
    body: null,
    bodyUsed: false,
    json: async () => ({}),
    text: async () => '',
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    clone: vi.fn()
})) as unknown as typeof fetch

window.env = {
    ENVIRONMENT_TYPE: 'testing',
    CLIMATE_ACTION_API_URL: 'http://localhost/api/v1/gateway',
    GEOCODE_URL: 'http://test-geocode-url',
    GEOCODE_API_KEY: 'test-ors-key',
    APPWRITE_PROJECT_ID: 'test-project-id',
    APPWRITE_ENDPOINT: 'http://test-endpoint',
    APPWRITE_WEBSITE_URL: 'http://test-website'
}

const createStorageMock = () => {
    let storage: Record<string, string> = {}
    return {
        getItem: (key: string) => (key in storage ? storage[key] : null),
        setItem: (key: string, value: string) => (storage[key] = value || ''),
        removeItem: (key: string) => delete storage[key],
        clear: () => (storage = {})
    }
}

Object.defineProperty(window, 'localStorage', { value: createStorageMock() })
Object.defineProperty(window, 'sessionStorage', { value: createStorageMock() })

// jsdom has no Web Animations API
Element.prototype.animate = vi.fn(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    currentTime: 0,
    effect: null,
    finished: Promise.resolve(),
    id: '',
    oncancel: null,
    onfinish: null,
    onremove: null,
    pending: false,
    playState: 'idle',
    playbackRate: 1,
    ready: Promise.resolve(),
    replaceState: 'active',
    startTime: 0,
    timeline: null,
    cancel: vi.fn(),
    commitStyles: vi.fn(),
    finish: vi.fn(),
    pause: vi.fn(),
    persist: vi.fn(),
    play: vi.fn(),
    reverse: vi.fn(),
    updatePlaybackRate: vi.fn()
})) as unknown as (
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions | undefined
) => Animation

// Expected noise from jsdom's missing canvas support and from error paths under test
const SILENCED_CONSOLE_ERRORS = [
    'URL.createObjectURL',
    'HTMLCanvasElement.prototype.getContext',
    'Not implemented: HTMLCanvasElement',
    'without installing the canvas npm package',
    'Error fetching plugins',
    'Plugin null does not exist',
    'Unsupported vector file format',
    'File could not be loaded due to',
    'Error fetching computation metadata for',
    'Error loading computation:',
    "Failed to create chart: can't acquire context"
]

const describeArg = (arg: unknown): string => {
    if (arg instanceof Error) {
        return arg.message
    }
    try {
        return String(arg ?? '')
    } catch {
        return '[unprintable]'
    }
}

// This file runs before every spec file in a shared worker; install the filter only once per worker
// so console.error does not become a chain of identical wrappers.
const CONSOLE_FILTER_INSTALLED = Symbol.for('climate-action.console-error-filter')
const globals = globalThis as { [CONSOLE_FILTER_INSTALLED]?: boolean }
if (!globals[CONSOLE_FILTER_INSTALLED]) {
    globals[CONSOLE_FILTER_INSTALLED] = true
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
        const fullMessage = args.map(describeArg).join(' ')
        if (SILENCED_CONSOLE_ERRORS.some(silenced => fullMessage.includes(silenced))) {
            return
        }
        originalConsoleError.apply(console, args)
    }
}

// jsdom reports unimplemented browser APIs (canvas, navigation) on its own console channel,
// which bypasses the filter above. Keep everything else it reports.
type JsdomErrorChannel = {
    removeAllListeners(event: 'jsdomError'): unknown
    on(event: 'jsdomError', listener: (error: Error) => void): unknown
}
const dom = (globalThis as { jsdom?: { virtualConsole: JsdomErrorChannel } }).jsdom
if (dom) {
    dom.virtualConsole.removeAllListeners('jsdomError')
    dom.virtualConsole.on('jsdomError', error => {
        if (!error.message.startsWith('Not implemented:')) {
            console.error(error)
        }
    })
}
