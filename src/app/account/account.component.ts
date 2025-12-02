import { Component, OnDestroy, OnInit } from '@angular/core'
import { TranslocoModule } from '@jsverse/transloco'
import { Models } from 'appwrite'
import {
    CircleUserRound,
    Footprints,
    LifeBuoy,
    LogIn,
    LogOut,
    LucideAngularModule,
    Percent,
    TestTubeDiagonal,
    User
} from 'lucide-angular'
import { Subscription } from 'rxjs'
import { environment } from '../../environments/environment'
import { AppwriteService } from '../auth/appwrite.service'
import { DashboardService } from '../dashboard/dashboard.service'
import { TourEngine } from '../dashboard/walkthrough/tour-engine.service'

@Component({
    selector: 'app-account',
    imports: [LucideAngularModule, TranslocoModule],
    templateUrl: './account.component.html',
    styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit, OnDestroy {
    user: Models.User<Models.Preferences> | null = null
    accountMenuOpen = false
    private userSubscription: Subscription
    private closeTimeout: ReturnType<typeof setTimeout> | null = null
    readonly environment = environment

    readonly CircleUserRound = CircleUserRound
    readonly User = User
    readonly LogIn = LogIn
    readonly Percent = Percent
    readonly LifeBuoy = LifeBuoy
    readonly Logout = LogOut
    readonly TestTubeDiagonal = TestTubeDiagonal
    readonly Footprints = Footprints

    constructor(
        private appwriteService: AppwriteService,
        private tourEngine: TourEngine,
        private dashboardService: DashboardService
    ) {
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

    async startTour() {
        this.dashboardService.clearDashboardState()
        this.tourEngine.initializeTour()
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
