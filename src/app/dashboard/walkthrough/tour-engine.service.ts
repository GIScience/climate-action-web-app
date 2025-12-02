import { Injectable, inject } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { TranslocoService } from '@jsverse/transloco'
import { Driver, driver } from 'driver.js'
import { firstValueFrom, take } from 'rxjs'
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
    private dashboardService = inject(DashboardService)
    private appwriteService = inject(AppwriteService)
    private dialog = inject(MatDialog)
    private tourStepsService = inject(TourStepsService)
    private storageService = inject(StorageService)
    private translocoService = inject(TranslocoService)

    private driverObj: Driver | null = null
    private currentSteps: ExtendedDriveStep[] = []
    private driverInitPromise: Promise<void>

    constructor() {
        this.driverInitPromise = this.loadDriver()
        this.translocoService.langChanges$.subscribe(lang => {
            this.driverInitPromise = this.loadDriver(lang)
        })
    }

    async initializeTour() {
        const isAuthenticated = await this.checkAuthentication()

        if (!isAuthenticated) {
            this.presentTourOptions()
        } else {
            if (this.storageService.getPendingTourState()) {
                this.storageService.clearTourAfterLoginFlag()
            }
            await this.startFullTour()
        }
    }

    async checkForPendingTour() {
        setTimeout(async () => {
            const getPendingTourState = this.storageService.getPendingTourState()
            const isAuthenticated = await this.checkAuthentication()

            if (getPendingTourState && isAuthenticated) {
                this.storageService.clearTourAfterLoginFlag()
                await this.startFullTour()
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
            width: '550px',
            autoFocus: false
        })

        dialogRef.afterClosed().subscribe((choice: TourChoice) => {
            switch (choice) {
                case TourChoice.LOGIN:
                    this.storageService.setTourAfterLoginFlag(true)
                    break
                case TourChoice.GUEST_TOUR:
                    void this.startGuestTour()
                    break
                case TourChoice.CANCEL:
                default:
                    break
            }
        })
    }

    private async startFullTour() {
        const mainTourSteps = this.tourStepsService.getFullTourSteps()
        await this.startTour(mainTourSteps)
    }

    private async startGuestTour() {
        const guestTourSteps = this.tourStepsService.getGuestTourSteps()
        await this.startTour(guestTourSteps)
    }

    private async startTour(steps: ExtendedDriveStep[]) {
        await this.ensureDriverReady()
        if (!this.driverObj) {
            console.error('Tour driver failed to initialise')
            return
        }

        this.currentSteps = steps
        this.driverObj.setSteps(steps)
        this.tourStepsService.setNextStepCallback(() => this.driverObj?.moveNext())
        this.driverObj.drive()
    }

    private async ensureDriverReady(): Promise<void> {
        if (!this.driverInitPromise) {
            this.driverInitPromise = this.loadDriver()
        }

        await this.driverInitPromise
    }

    private async loadDriver(lang = this.translocoService.getActiveLang()): Promise<void> {
        try {
            const translations = await firstValueFrom(
                this.translocoService
                    .selectTranslateObject<{
                        prevButton: string
                        closeButton: string
                        exitConfirmation: string
                    }>('walkthrough.tourEngine', {}, lang)
                    .pipe(take(1))
            )
            this.configureDriver(translations)
        } catch (error) {
            console.warn(`Failed to load tour translations for lang ${lang}`, error)
            this.configureDriver({
                prevButton: this.translocoService.translate('walkthrough.tourEngine.prevButton', {}, lang),
                closeButton: this.translocoService.translate('walkthrough.tourEngine.closeButton', {}, lang),
                exitConfirmation: this.translocoService.translate('walkthrough.tourEngine.exitConfirmation', {}, lang)
            })
        }
    }

    private configureDriver(translations: { prevButton: string; closeButton: string; exitConfirmation: string }) {
        const exitConfirmation = translations.exitConfirmation

        this.driverObj = driver({
            showProgress: true,
            animate: true,
            showButtons: ['next', 'previous', 'close'],
            prevBtnText: translations.prevButton,
            doneBtnText: translations.closeButton,
            steps: [],
            overlayOpacity: 0.3,
            onDestroyStarted: () => {
                const instance = this.driverObj
                if (!instance) {
                    return
                }

                if (!instance.hasNextStep() || confirm(exitConfirmation)) {
                    instance.destroy()
                }
            },
            onDestroyed: () => {
                this.tourStepsService.cleanupEventHandlers()
            },
            onPrevClick: () => {
                this.tourStepsService.cleanupEventHandlers()
                this.dashboardService.clearDashboardState()
                this.driverObj?.drive(0)
            },
            onNextClick: () => {
                const instance = this.driverObj
                if (!instance) {
                    return
                }

                if (!instance.hasNextStep()) {
                    instance.destroy()
                } else {
                    const currentStepIndex = instance.getActiveIndex()
                    if (currentStepIndex !== undefined && currentStepIndex < this.currentSteps.length) {
                        this.currentSteps[currentStepIndex]?.onNextClicked?.()
                    }
                }
            }
        })

        if (this.currentSteps.length) {
            this.driverObj.setSteps(this.currentSteps)
        }
    }
}
