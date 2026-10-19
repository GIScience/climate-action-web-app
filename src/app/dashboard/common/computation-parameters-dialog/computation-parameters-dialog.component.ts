import { NgClass } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { TranslocoModule } from '@jsverse/transloco'
import { LucideX } from '@lucide/angular'
import { NgScrollbarModule } from 'ngx-scrollbar'
import {
    formatParameterName,
    getParameterEntries,
    hasUserRequestedParams,
    isUserRequestedParam
} from '../../computations-index/computation-parameter.utils'
import { ComputationParameters } from '../../computations-index/computation.interface'

export interface ComputationParametersDialogData {
    params?: ComputationParameters
    requestedParams?: ComputationParameters
}

@Component({
    selector: 'app-computation-parameters-dialog',
    imports: [NgClass, TranslocoModule, LucideX, NgScrollbarModule],
    templateUrl: './computation-parameters-dialog.component.html',
    styleUrl: './computation-parameters-dialog.component.scss'
})
export class ComputationParametersDialogComponent {
    readonly data = inject<ComputationParametersDialogData>(MAT_DIALOG_DATA)
    private dialogRef = inject(MatDialogRef<ComputationParametersDialogComponent>)

    getParameterEntries = getParameterEntries
    isUserRequestedParam = isUserRequestedParam
    hasUserRequestedParams = hasUserRequestedParams
    formatParameterName = formatParameterName

    close(): void {
        this.dialogRef.close()
    }
}
