import { Injectable } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'
import { environment } from '@environments/environment'
import { Account, Client, Models } from 'appwrite'
import { BehaviorSubject } from 'rxjs'

@Injectable({
    providedIn: 'root'
})
export class AppwriteService {
    private client = new Client()
    private account = new Account(this.client)
    public _user = new BehaviorSubject<Models.User<Models.Preferences> | null>(null)

    constructor(private snackBar: MatSnackBar) {
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
            if (!environment.production) {
                console.warn('Login failed, creating a fake user for testing purposes.')
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
                this._user.next(mockUser)
                this.snackBar.open('Login was unsuccessful. Computations created now will not persist!', 'Close', {
                    verticalPosition: 'bottom',
                    horizontalPosition: 'center',
                    panelClass: ['error-snackbar']
                })
                return true
            }
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
