describe('External Requests', () => {
    const allowlist = [
        'http://localhost',
        'https://tile.openstreetmap.org'
    ];

    const cypressInternalPatterns = [
        'https://firefox.settings.services.mozilla.com',
        'https://tracking-protection.cdn.mozilla.net',
        'https://firefox-settings-attachments.cdn.mozilla.net'
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