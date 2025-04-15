import { Injectable } from '@angular/core'
import { Account, Client, Models } from 'appwrite'
import { BehaviorSubject } from 'rxjs'
import { environment } from '../environments/environment'

@Injectable({
    providedIn: 'root'
})
export class AppwriteService {
    private client = new Client()
    private account = new Account(this.client)
    public _user = new BehaviorSubject<Models.User<Models.Preferences> | null>(null)

    constructor() {
        this.client.setEndpoint(environment.appwriteEndpoint + '/v1').setProject(environment.appwriteProjectId)

        this.tryToLogin()
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

    async tryToLogout() {
        try {
            await this.account.deleteSession('current')
        } catch (error) {
            console.error('Error deleting session:', error)
        } finally {
            this._user.next(null)
        }
    }
}
