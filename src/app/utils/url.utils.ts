export function getCurrentCanonicalUrl(): string {
    const currentPath = window.location.pathname.split('?')[0]
    const baseUrl = window.location.origin
    return `${baseUrl}${currentPath}`
}
