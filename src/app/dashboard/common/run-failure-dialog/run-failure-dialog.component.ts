import { Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { TranslocoModule } from '@jsverse/transloco'
import { LucideCheck, LucideCopy, LucideMail, LucideX } from '@lucide/angular'
import { ComputationDatabaseEntity } from '../../computations-index/computation.interface'

export interface RunFailureDialogData {
    revoked: boolean
    pluginName: string
    aoiName: ComputationDatabaseEntity['aoiName']
    correlationUuid: string
    message?: string
    mailto: string
}

@Component({
    selector: 'app-run-failure-dialog',
    imports: [TranslocoModule, LucideCheck, LucideCopy, LucideMail, LucideX],
    templateUrl: './run-failure-dialog.component.html',
    styleUrl: './run-failure-dialog.component.scss'
})
export class RunFailureDialogComponent {
    readonly data = inject<RunFailureDialogData>(MAT_DIALOG_DATA)
    private dialogRef = inject(MatDialogRef<RunFailureDialogComponent>)

    readonly copied = signal(false)

    copyRunId(): void {
        navigator.clipboard.writeText(this.data.correlationUuid)
        this.copied.set(true)
        setTimeout(() => this.copied.set(false), 2000)
    }

    contactSupport(): void {
        window.open(this.data.mailto, '_blank')
    }

    close(): void {
        this.dialogRef.close()
    }
}
