import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone'

setupZoneTestEnv()

// Polyfill for fetch API in tests (required for Appwrite SDK v19+)
{
    const g = globalThis as any

    // Only define missing pieces; don't overwrite if environment provides them
    if (typeof g.Headers === 'undefined') {
        g.Headers = class Headers {
            private headers: Record<string, string> = {}
            append(name: string, value: string) {
                this.headers[name.toLowerCase()] = value
            }
            get(name: string) {
                return this.headers[name.toLowerCase()] ?? null
            }
            has(name: string) {
                return name.toLowerCase() in this.headers
            }
            set(name: string, value: string) {
                this.headers[name.toLowerCase()] = value
            }
            delete(name: string) {
                delete this.headers[name.toLowerCase()]
            }
            forEach(callback: (value: string, key: string) => void) {
                Object.entries(this.headers).forEach(([key, value]) => callback(value, key))
            }
        }
    }

    if (typeof g.Request === 'undefined') {
        g.Request = class Request {} as any
    }
    if (typeof g.Response === 'undefined') {
        g.Response = class Response {} as any
    }

    if (typeof g.fetch === 'undefined') {
        g.fetch = jest.fn(async () => ({
            ok: true,
            status: 200,
            statusText: 'OK',
            url: '',
            redirected: false,
            type: 'basic',
            headers: new g.Headers(),
            body: null,
            bodyUsed: false,
            json: async () => ({}),
            text: async () => '',
            arrayBuffer: async () => new ArrayBuffer(0),
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            clone: jest.fn()
        })) as jest.Mock
    }
}

const mock = () => {
    let storage: { [key: string]: string } = {}
    return {
        getItem: (key: string) => (key in storage ? storage[key] : null),
        setItem: (key: string, value: string) => (storage[key] = value || ''),
        removeItem: (key: string) => delete storage[key],
        clear: () => (storage = {})
    }
}

Object.defineProperty(window, 'localStorage', { value: mock() })
Object.defineProperty(window, 'sessionStorage', { value: mock() })

Element.prototype.animate = jest.fn(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
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
    cancel: jest.fn(),
    commitStyles: jest.fn(),
    finish: jest.fn(),
    pause: jest.fn(),
    persist: jest.fn(),
    play: jest.fn(),
    reverse: jest.fn(),
    updatePlaybackRate: jest.fn()
})) as unknown as (
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions | undefined
) => Animation
