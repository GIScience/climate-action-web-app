import { Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { environment } from '@environments/environment'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import { LucideCheck, LucideCopy, LucideMail, LucideX } from '@lucide/angular'
import { formatShortUUID } from '../../computations-index/computation-format.utils'
import { ComputationDatabaseEntity } from '../../computations-index/computation.interface'

export interface RunFailureDialogData {
    run: ComputationDatabaseEntity
    pluginName: string
    message?: string
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
    private translocoService = inject(TranslocoService)

    readonly revoked = this.data.run.status === 'REVOKED'
    readonly copied = signal(false)

    copyRunId(): void {
        navigator.clipboard.writeText(this.data.run.correlation_uuid)
        this.copied.set(true)
        setTimeout(() => this.copied.set(false), 2000)
    }

    contactSupport(): void {
        const { correlation_uuid } = this.data.run
        const subject = this.translocoService.translate('computationsIndex.runFailure.emailSubject', {
            id: formatShortUUID(correlation_uuid)
        })
        const body = this.translocoService.translate('computationsIndex.runFailure.emailBody', {
            plugin: this.data.pluginName,
            id: correlation_uuid
        })
        const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        window.open(`mailto:${environment.supportEmail}?${query}`, '_blank')
    }

    close(): void {
        this.dialogRef.close()
    }
}
