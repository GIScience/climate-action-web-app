import { Injectable } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { Driver, driver } from 'driver.js'
import { AppwriteService } from '../../auth/appwrite.service'
import { StorageService } from '../../storage.service'
import { DashboardService } from '../dashboard.service'
import { TourChoice, TourChoiceDialogComponent } from './tour-choice-dialog.component'
import { TourStepsService } from './tour-steps.service'
import { ExtendedDriveStep } from './tour.interfaces'

@Injectable({
    providedIn: 'root'
})
export class TourEngine {
    private driverObj: Driver
    private currentSteps: ExtendedDriveStep[] = []

    constructor(
        private dashboardService: DashboardService,
        private appwriteService: AppwriteService,
        private dialog: MatDialog,
        private tourStepsService: TourStepsService,
        private storageService: StorageService
    ) {
        this.driverObj = driver({
            showProgress: true,
            animate: true,
            showButtons: ['next', 'previous', 'close'],
            prevBtnText: '↺ Restart',
            doneBtnText: 'Close',
            steps: [],
            overlayOpacity: 0.3,
            onDestroyStarted: () => {
                if (
                    !this.driverObj.hasNextStep() ||
                    confirm(
                        'Are you sure you want to exit the walkthrough? You can always restart it from the Account menu.'
                    )
                ) {
                    this.driverObj.destroy()
                }
            },
            onDestroyed: () => {
                this.tourStepsService.cleanupEventHandlers()
            },
            onPrevClick: () => {
                this.tourStepsService.cleanupEventHandlers()
                this.dashboardService.clearDashboardState()
                this.driverObj.drive(0)
            },
            onNextClick: () => {
                if (!this.driverObj.hasNextStep()) {
                    this.driverObj.destroy()
                } else {
                    const currentStepIndex = this.driverObj.getActiveIndex()
                    if (currentStepIndex !== undefined && currentStepIndex < this.currentSteps.length) {
                        this.currentSteps[currentStepIndex]?.onNextClicked?.()
                    }
                }
            }
        })
    }

    startTour(steps: ExtendedDriveStep[]) {
        this.currentSteps = steps
        this.driverObj.setSteps(steps)
        this.tourStepsService.setNextStepCallback(() => this.driverObj.moveNext())
        this.driverObj.drive()
    }

    async initializeTour() {
        const isAuthenticated = await this.checkAuthentication()

        if (!isAuthenticated) {
            this.presentTourOptions()
        } else {
            if (this.storageService.getPendingTourState()) {
                this.storageService.clearTourAfterLoginFlag()
            }
            this.startFullTour()
        }
    }

    async checkForPendingTour() {
        setTimeout(async () => {
            const getPendingTourState = this.storageService.getPendingTourState()
            const isAuthenticated = await this.checkAuthentication()

            if (getPendingTourState && isAuthenticated) {
                this.storageService.clearTourAfterLoginFlag()
                this.startFullTour()
            }
        }, 1000)
    }

    private async checkAuthentication(): Promise<boolean> {
        const currentUser = this.appwriteService._user.value
        if (currentUser) {
            return true
        }

        return await this.appwriteService.tryToLogin()
    }

    private presentTourOptions() {
        const dialogRef = this.dialog.open(TourChoiceDialogComponent, {
            width: '500px',
            autoFocus: false
        })

        dialogRef.afterClosed().subscribe((choice: TourChoice) => {
            switch (choice) {
                case TourChoice.LOGIN:
                    this.storageService.setTourAfterLoginFlag(true)
                    break
                case TourChoice.GUEST_TOUR:
                    this.startGuestTour()
                    break
                case TourChoice.CANCEL:
                default:
                    break
            }
        })
    }

    private startFullTour() {
        const mainTourSteps = this.tourStepsService.getFullTourSteps()
        this.startTour(mainTourSteps)
    }

    private startGuestTour() {
        const guestTourSteps = this.tourStepsService.getGuestTourSteps()
        this.startTour(guestTourSteps)
    }
}
