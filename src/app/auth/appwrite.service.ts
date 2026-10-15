import { EventEmitter, Injectable } from '@angular/core'
import { environment } from '@environments/environment'
import { Account, Client, Models, TablesDB } from 'appwrite'
import { BehaviorSubject } from 'rxjs'
import { getCurrentCanonicalUrl } from '../utils/url.utils'

export interface BasicKeyInfo extends Models.Row {
    hash: string
    tyk_user_id: string
    ors_policy: string
    policy_upgrade_requests: string[]
    key: string
}

@Injectable({
    providedIn: 'root'
})
export class AppwriteService {
    private client = new Client()
    private account = new Account(this.client)
    private tablesDB = new TablesDB(this.client)
    public _user = new BehaviorSubject<Models.User<Models.Preferences> | null>(null)
    public onLogout = new EventEmitter<void>()
    private beforeLogoutHooks: Array<() => Promise<void>> = []

    constructor() {
        this.client.setEndpoint(environment.appwriteEndpoint + '/v1').setProject(environment.appwriteProjectId)

        this.tryToLogin()
    }

    getTablesDB(): TablesDB {
        return this.tablesDB
    }

    getBasicKey(): Promise<BasicKeyInfo | null> {
        const userId = this._user.value?.$id
        if (!userId) return Promise.resolve(null)
        return this.tablesDB.getRow<BasicKeyInfo>({
            databaseId: 'tyk_integration',
            tableId: 'basic_keys',
            rowId: userId
        })
    }

    getAppwriteUrl(path: string): string {
        return `${environment.appwriteWebsiteUrl}${path}`
    }

    getRedirectUrl(): string {
        return getCurrentCanonicalUrl()
    }

    async tryToLogin(): Promise<boolean> {
        try {
            const user = await this.account.get()
            if (user.email === '') {
                throw Error('Anonymous Session detected')
            }
            this._user.next(user)
            return true
        } catch (_error) {
            this._user.next(null)
            return false
        }
    }

    loginAsFakeUser() {
        if (environment.environmentType === 'development' || environment.environmentType === 'testing') {
            const mockUser: Models.User<Models.Preferences> = {
                $id: 'fake-user-id',
                $createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString(),
                name: 'Fake User',
                email: 'fake.user@heigit.org',
                emailVerification: true,
                labels: ['signupCompleted'],
                prefs: {}
            } as Models.User<Models.Preferences>

            sessionStorage.setItem('initialSyncCompleted', 'true')
            this._user.next(mockUser)
            return true
        }
        return false
    }

    // Registers a hook to run before logout, while the session is still valid
    // (e.g. to upload pending changes). Hooks are awaited, for up to 3 seconds
    // in total. onLogout handlers, in contrast, run after the session is
    // deleted and are not awaited.
    registerBeforeLogout(hook: () => Promise<void>): void {
        this.beforeLogoutHooks.push(hook)
    }

    private async runBeforeLogoutHooks(): Promise<void> {
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
            await Promise.race([
                Promise.allSettled(this.beforeLogoutHooks.map(hook => hook())),
                new Promise(resolve => {
                    timer = setTimeout(resolve, 3000)
                })
            ])
        } catch (error) {
            // Hooks must never block logout
            console.warn('Error running before-logout hooks:', error)
        } finally {
            clearTimeout(timer)
        }
    }

    async tryToLogout() {
        await this.runBeforeLogoutHooks()
        try {
            await this.account.deleteSession('current')
            this.onLogout.emit()
            sessionStorage.removeItem('initialSyncCompleted')
            sessionStorage.removeItem('api_key_cache')
        } catch (error) {
            console.error('Error deleting session:', error)
        } finally {
            this._user.next(null)
            window.location.reload()
        }
    }
}
