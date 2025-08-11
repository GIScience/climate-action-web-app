describe('External Requests', () => {
    const allowlist = [
        'http://localhost',
        'https://tiles.versatiles.org',
        'https://api.openrouteservice.org',
        'https://*.heigit.org',
        'https://server.arcgisonline.com'
    ]

    const cypressInternalPatterns = [
        'https://content-autofill.googleapis.com',
        'https://safebrowsingohttpgateway.googleapis.com',
        'https://safebrowsing.googleapis.com',
        'https://optimizationguide-pa.googleapis.com',
        'https://android.clients.google.com'
    ]

    it('should only make external calls to allowlisted URLs', () => {
        cy.intercept('*', req => {
            const isAllowlisted = allowlist.some(pattern => {
                if (pattern.includes('*')) {
                    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')
                    return new RegExp(`^${regexPattern}`).test(req.url)
                }
                return req.url.startsWith(pattern)
            })
            const isCypressInternal = cypressInternalPatterns.some(url => req.url.startsWith(url))

            if (!isAllowlisted && !isCypressInternal) {
                throw new Error(`The request URL ${req.url} is not allowlisted`)
            }
        })

        cy.visit('/')
    })
})
