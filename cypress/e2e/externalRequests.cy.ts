describe('External Requests', () => {
    const allowlist = [
        'http://localhost',
        'https://tile.openstreetmap.org',
        'https://api.openrouteservice.org',
        'https://maps.heigit.org'
    ];

    const cypressInternalPatterns = [
        'https://content-autofill.googleapis.com',
        'https://safebrowsingohttpgateway.googleapis.com',
        'https://optimizationguide-pa.googleapis.com'
    ];

    it('should only make external calls to allowlisted URLs', () => {
        cy.intercept('*', (req) => {
            const isAllowlisted = allowlist.some(url => req.url.startsWith(url));
            const isCypressInternal = cypressInternalPatterns.some(url => req.url.startsWith(url));

            if (!isAllowlisted && !isCypressInternal) {
                throw new Error(`The request URL ${req.url} is not allowlisted`);
            }

        });

        cy.visit('/');
    });
});