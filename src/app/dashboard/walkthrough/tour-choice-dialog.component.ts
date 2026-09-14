import { Component, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { TranslocoModule } from '@jsverse/transloco'
import { LucideLogIn, LucidePlay, LucideX } from '@lucide/angular'
import { AppwriteService } from '../../auth/appwrite.service'

export enum TourChoice {
    LOGIN = 'login',
    GUEST_TOUR = 'guest_tour',
    CANCEL = 'cancel'
}

@Component({
    selector: 'app-tour-choice-dialog',
    imports: [MatDialogModule, MatButtonModule, LucideLogIn, LucidePlay, LucideX, TranslocoModule],
    templateUrl: './tour-choice-dialog.component.html',
    styleUrls: ['./tour-choice-dialog.component.scss']
})
export class TourChoiceDialogComponent {
    dialogRef = inject<MatDialogRef<TourChoiceDialogComponent>>(MatDialogRef)
    private appwriteService = inject(AppwriteService)

    closeDialog(): void {
        this.dialogRef.close(TourChoice.CANCEL)
    }

    onLoginClick(): void {
        const redirectUrl = this.appwriteService.getRedirectUrl()
        const loginUrl = this.appwriteService.getAppwriteUrl(`/login?redirect=${redirectUrl}`)

        window.open(loginUrl, '_blank')
        this.dialogRef.close(TourChoice.LOGIN)
    }

    onGuestTourClick(): void {
        this.dialogRef.close(TourChoice.GUEST_TOUR)
    }
}
