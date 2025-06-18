// Mock browser APIs that might not be available in test environment

if (typeof window !== 'undefined') {
    // Mock URL.createObjectURL used by Plotly Maps
    window.URL.createObjectURL = () => ''
    window.URL.revokeObjectURL = () => {}
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
