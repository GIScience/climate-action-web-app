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
    const errorMessage = args[0]?.toString?.() || args[0]?.message || ''

    if (errorMessage.includes('URL.createObjectURL')) {
        return
    }
    if (errorMessage.includes('HTMLCanvasElement.prototype.getContext')) {
        return
    }
    if (errorMessage.includes('Not implemented: HTMLCanvasElement')) {
        return
    }
    if (errorMessage.includes('without installing the canvas npm package')) {
        return
    }
    originalConsoleError.apply(console, args)
}
