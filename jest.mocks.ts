// Mock browser APIs that might not be available in test environment

// Mock URL.createObjectURL used by Plotly Maps
if (typeof window !== 'undefined') {
    window.URL.createObjectURL = () => ''
    window.URL.revokeObjectURL = () => {}
}

// Export the mock class for manual use if needed
export class MockToastrService {
    success = jest.fn()
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
    originalConsoleError.apply(console, args)
}
