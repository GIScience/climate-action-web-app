import { EventEmitter, Injectable } from '@angular/core'
import { environment } from '@environments/environment'
import { Account, Client, Databases, Models } from 'appwrite'
import { BehaviorSubject } from 'rxjs'

@Injectable({
    providedIn: 'root'
})
export class AppwriteService {
    private client = new Client()
    private account = new Account(this.client)
    private databases = new Databases(this.client)
    public _user = new BehaviorSubject<Models.User<Models.Preferences> | null>(null)
    public onLogout = new EventEmitter<void>()

    // @ts-ignore: Suppress TypeScript error for test environment detection
    private isTestEnvironment = typeof jest !== 'undefined' || typeof Cypress !== 'undefined'

    constructor() {
        this.client.setEndpoint(environment.appwriteEndpoint + '/v1').setProject(environment.appwriteProjectId)

        this.tryToLogin()
    }

    getDatabases(): Databases {
        return this.databases
    }

    async tryToLogin(): Promise<boolean> {
        try {
            const user = await this.account.get()
            if (user.email === '') {
                throw Error('Anonymous Session detected')
            }
            this._user.next(user)
            return true
        } catch (error) {
            this._user.next(null)
            return false
        }
    }

    loginAsFakeUser() {
        if (!environment.production) {
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

    async tryToLogout() {
        try {
            await this.account.deleteSession('current')
            this.onLogout.emit()
            sessionStorage.removeItem('initialSyncCompleted')
        } catch (error) {
            console.error('Error deleting session:', error)
        } finally {
            this._user.next(null)
            window.location.reload()
        }
    }
}
