import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone'

setupZoneTestEnv()

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
