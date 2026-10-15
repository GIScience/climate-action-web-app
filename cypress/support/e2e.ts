import 'cypress-fail-fast'
import 'cypress-file-upload'
import 'cypress-real-events'
import { addCompareSnapshotCommand } from 'cypress-visual-regression/dist/command'
import { cypressEnvironment } from './cypress-environment'
import { stubMapNetwork } from './interceptors'

addCompareSnapshotCommand()

const RUNS_DB_NAME = 'climate_action_local'

beforeEach(() => {
    cy.intercept(`${cypressEnvironment.cachetUrl}/**`, { body: { data: [], included: [] } }).as('blockCachetCalls')

    cy.intercept('**/v1/account', {
        statusCode: 401,
        body: { message: 'User (role: guests) missing scope (account)', code: 401, type: 'general_unauthorized_scope' }
    }).as('blockAppwriteSessionCheck')

    cy.intercept(`**/${cypressEnvironment.apiBasePath}/**`, {
        statusCode: 404,
        body: {
            error: 'API call not mocked in Cypress test'
        }
    }).as('blockUnmockedApiCalls')

    stubMapNetwork()

    // Keep this one last: it only switches logging off and passes requests on to the stubs above.
    cy.intercept({ resourceType: /xhr|fetch/ }, { log: false })

    // Unlike localStorage, IndexedDB is not cleared by Cypress between tests
    cy.wrap(
        new Cypress.Promise<void>(resolve => {
            const request = indexedDB.deleteDatabase(RUNS_DB_NAME)
            request.onsuccess = request.onerror = request.onblocked = () => resolve()
        }),
        { log: false }
    )
})

// Replaces the runs saved in IndexedDB, which the app loads on startup. Runs on the spec frame's
// IndexedDB, which shares the app's origin, so it works before the first visit.
Cypress.Commands.add('seedPluginRuns', runs => {
    cy.wrap(
        new Cypress.Promise<void>((resolve, reject) => {
            const request = indexedDB.open(RUNS_DB_NAME, 1)
            // Mirrors the schema in RunsDbService, in case the app has not created it yet
            request.onupgradeneeded = () => {
                request.result.createObjectStore('runs', { keyPath: 'correlation_uuid' })
                request.result.createObjectStore('outbox', { autoIncrement: true })
            }
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                const db = request.result
                const tx = db.transaction('runs', 'readwrite')
                tx.objectStore('runs').clear()
                runs.forEach(run => tx.objectStore('runs').put(run))
                tx.onerror = () => reject(tx.error)
                tx.oncomplete = () => {
                    db.close()
                    resolve()
                }
            }
        }),
        { log: false }
    )
})

Cypress.Commands.add('waitForRenderComplete', () => {
    cy.window({ log: false, timeout: 15000 }).should('have.property', 'map')

    cy.window().then({ timeout: 15000 }, win => {
        return new Cypress.Promise(resolve => {
            const map = (win as any).map

            const timeout = setTimeout(() => {
                resolve()
            }, 10000)

            map.once('idle', () => {
                clearTimeout(timeout)
                resolve()
            })

            // An already-idle map never emits 'idle' again on its own; force one frame so it does.
            if (typeof map.triggerRepaint === 'function') {
                map.triggerRepaint()
            }
        })
    })
})

Cypress.Commands.add('clickFakeUserButtonUntilGone', () => {
    cy.get('body').then($body => {
        if ($body.find('button.fake-user-button').length > 0) {
            cy.get('button.fake-user-button').click({ force: true })
            cy.wait(1000)
            cy.get('body').then($bodyAfter => {
                if ($bodyAfter.find('button.fake-user-button').length > 0) {
                    cy.wait(1000)
                    cy.clickFakeUserButtonUntilGone()
                }
            })
        }
    })
})
