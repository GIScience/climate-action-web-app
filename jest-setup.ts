// Mock browser APIs that might not be available in test environment

if (typeof window !== 'undefined') {
    // Mock URL.createObjectURL used by Plotly Maps
    window.URL.createObjectURL = () => ''
    window.URL.revokeObjectURL = () => {}
}

const originalConsoleError = console.error
console.error = (...args: any[]) => {
    if (args[0]?.includes?.('URL.createObjectURL')) {
        return
    }
    originalConsoleError.apply(console, args)
}
