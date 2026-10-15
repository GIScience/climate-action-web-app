import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core'
import { RunSyncService, SyncState } from '@app/persistence/run-sync.service'
import { TranslocoModule } from '@jsverse/transloco'
import {
    LucideCloudAlert,
    LucideCloudUpload,
    LucideDynamicIcon,
    LucideFootprints,
    LucideIcon,
    LucideLifeBuoy,
    LucideLogIn,
    LucideLogOut,
    LucidePercent,
    LucideTestTubeDiagonal,
    LucideUser,
    LucideUserRound
} from '@lucide/angular'
import { TippyDirective } from '@ngneat/helipopper'
import { Models } from 'appwrite'
import { Subscription } from 'rxjs'
import { environment } from '../../environments/environment'
import { AppwriteService } from '../auth/appwrite.service'
import { DashboardService } from '../dashboard/dashboard.service'
import { TourEngine } from '../dashboard/walkthrough/tour-engine.service'
import { DropdownMenuDirective } from '../shared/dropdown-menu.directive'

const SYNC_BADGES: Partial<Record<SyncState, { icon: LucideIcon; labelKey: string }>> = {
    pending: { icon: LucideCloudUpload, labelKey: 'syncIndicator.pending' },
    syncing: { icon: LucideCloudUpload, labelKey: 'syncIndicator.syncing' },
    error: { icon: LucideCloudAlert, labelKey: 'syncIndicator.error' }
}

@Component({
    selector: 'app-account',
    imports: [
        LucideDynamicIcon,
        LucideFootprints,
        LucideLifeBuoy,
        LucideLogIn,
        LucideLogOut,
        LucidePercent,
        LucideTestTubeDiagonal,
        LucideUser,
        LucideUserRound,
        TranslocoModule,
        DropdownMenuDirective,
        TippyDirective
    ],
    templateUrl: './account.component.html',
    styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit, OnDestroy {
    private appwriteService = inject(AppwriteService)
    private tourEngine = inject(TourEngine)
    private dashboardService = inject(DashboardService)
    private runSync = inject(RunSyncService)

    readonly syncState = this.runSync.syncState
    readonly syncBadge = computed(() => SYNC_BADGES[this.syncState()] ?? null)

    user: Models.User<Models.Preferences> | null = null
    accountMenuOpen = false
    private userSubscription: Subscription
    readonly environment = environment

    constructor() {
        this.userSubscription = this.appwriteService._user.subscribe(user => {
            this.user = user
        })
    }

    async ngOnInit() {
        await this.appwriteService.tryToLogin()
    }

    ngOnDestroy() {
        this.userSubscription.unsubscribe()
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
        this.accountMenuOpen = false
        this.dashboardService.clearDashboardState()
        this.tourEngine.initializeTour()
    }

    retrySync(): void {
        this.runSync.retrySync()
    }

    toggleAccountMenu() {
        this.accountMenuOpen = !this.accountMenuOpen
    }

    closeAccountMenu() {
        this.accountMenuOpen = false
    }
}
