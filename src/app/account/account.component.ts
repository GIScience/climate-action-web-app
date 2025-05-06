import { CommonModule } from '@angular/common'
import { Component, OnDestroy, OnInit } from '@angular/core'
import { Models } from 'appwrite'
import {
    KeyRound,
    LifeBuoy,
    LogOut,
    LucideAngularModule,
    Percent,
    SquareUserRound,
    TestTubeDiagonal,
    User,
    UserPlus
} from 'lucide-angular'
import { Subscription } from 'rxjs'
import { environment } from '../../environments/environment'
import { AppwriteService } from '../appwrite.service'

@Component({
    selector: 'app-account',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './account.component.html',
    styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit, OnDestroy {
    user: Models.User<Models.Preferences> | null = null
    accountMenuOpen = false
    private userSubscription: Subscription
    private closeTimeout: ReturnType<typeof setTimeout> | null = null
    readonly environment = environment

    readonly SquareUserRound = SquareUserRound
    readonly User = User
    readonly UserPlus = UserPlus
    readonly KeyRound = KeyRound
    readonly Percent = Percent
    readonly LifeBuoy = LifeBuoy
    readonly Logout = LogOut
    readonly TestTubeDiagonal = TestTubeDiagonal

    constructor(private appwriteService: AppwriteService) {
        this.userSubscription = this.appwriteService._user.subscribe(user => {
            this.user = user
        })
    }

    async ngOnInit() {
        await this.appwriteService.tryToLogin()
    }

    ngOnDestroy() {
        this.userSubscription.unsubscribe()
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout)
        }
    }

    async logout() {
        await this.appwriteService.tryToLogout()
        this.accountMenuOpen = false
    }

    getAppwriteUrl(path: string): string {
        return this.appwriteService.getAppwriteUrl(path)
    }

    getRedirectUrl(): string {
        return this.appwriteService.getRedirectUrl()
    }

    loginAsFakeUser() {
        this.appwriteService.loginAsFakeUser()
    }

    toggleAccountMenu() {
        this.accountMenuOpen = !this.accountMenuOpen
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout)
            this.closeTimeout = null
        }
    }

    closeAccountMenu() {
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout)
        }
        this.closeTimeout = setTimeout(() => {
            this.accountMenuOpen = false
            this.closeTimeout = null
        }, 500)
    }

    cancelAccountMenuClose() {
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout)
            this.closeTimeout = null
        }
    }
}
