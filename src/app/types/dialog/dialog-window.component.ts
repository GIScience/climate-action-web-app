import { CommonModule } from '@angular/common'
import { Component, Inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import { FormlyField, FormlyFieldConfig } from '@ngx-formly/core'
import { CircleX, LucideAngularModule } from 'lucide-angular'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ToastrService } from 'ngx-toastr'

@Component({
    selector: 'app-dialog-window',
    imports: [
        CommonModule,
        FormlyField,
        MatDialogModule,
        MatButtonModule,
        LucideAngularModule,
        NgScrollbarModule,
        TranslocoModule
    ],
    templateUrl: './dialog-window.component.html',
    styleUrls: ['./dialog-window.component.scss']
})
export class DialogWindowComponent {
    constructor(
        public dialogRef: MatDialogRef<DialogWindowComponent>,
        private toastr: ToastrService,
        private translocoService: TranslocoService,
        @Inject(MAT_DIALOG_DATA) public data: FormlyFieldConfig
    ) {}

    readonly CircleX = CircleX

    closeDialog(): void {
        if (confirm(this.translocoService.translate('dialog.confirmClose'))) {
            this.resetDialog()
            this.dialogRef.close()
        }
    }

    saveDialog(): void {
        this.dialogRef.close()
        const translatedLabel = this.translocoService.translate(this.data.props?.label || '')
        this.toastr.success(this.translocoService.translate('dialog.valuesSaved', { label: translatedLabel }), '', {
            timeOut: 4000
        })
    }

    resetDialog(): void {
        this.resetFieldGroup(this.data.fieldGroup || [])
        const translatedLabel = this.translocoService.translate(this.data.props?.label || '')
        this.toastr.info(this.translocoService.translate('dialog.valuesReset', { label: translatedLabel }), '', {
            timeOut: 4000
        })
    }

    private resetFieldGroup(fieldGroup: FormlyFieldConfig[]): void {
        fieldGroup.forEach(field => {
            if (field.fieldGroup) {
                this.resetFieldGroup(field.fieldGroup)
            } else if (field.formControl) {
                field.formControl.reset()
                field.formControl.markAsPristine()
                field.formControl.markAsUntouched()
            }
        })
    }
}
