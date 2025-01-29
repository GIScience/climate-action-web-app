export function beforeCompareSnapshots(ignoredElementsQuerySelector: string, appContentQuerySelector: string = 'body') {
    Cypress.Commands.overwrite('compareSnapshot', (originalFn, ...args) => {
        return cy
            .get(appContentQuerySelector)
            .then($app => {
                return new Cypress.Promise((resolve, reject) => {
                    setTimeout(() => {
                        $app.find(ignoredElementsQuerySelector).css('visibility', 'hidden')
                        resolve()
                    }, 500)
                })
            })
            .then(() => {
                return originalFn(...args)
            })
    })
}
