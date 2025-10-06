import { CommonModule } from '@angular/common'
import { Component, Inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { FormlyFieldConfig, FormlyField } from '@ngx-formly/core'
import { CircleX, LucideAngularModule } from 'lucide-angular'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ToastrService } from 'ngx-toastr'

@Component({
    selector: 'app-dialog-window',
    imports: [CommonModule, FormlyField, MatDialogModule, MatButtonModule, LucideAngularModule, NgScrollbarModule],
    templateUrl: './dialog-window.component.html',
    styleUrls: ['./dialog-window.component.scss']
})
export class DialogWindowComponent {
    constructor(
        public dialogRef: MatDialogRef<DialogWindowComponent>,
        private toastr: ToastrService,
        @Inject(MAT_DIALOG_DATA) public data: FormlyFieldConfig
    ) {}

    readonly CircleX = CircleX

    closeDialog(): void {
        if (confirm('Are you sure you want to close without saving? Values will be reset to their defaults.')) {
            this.resetDialog()
            this.dialogRef.close()
        }
    }

    saveDialog(): void {
        this.dialogRef.close()
        this.toastr.success(`${this.data.props?.label} values have been saved.`, '', {
            timeOut: 4000
        })
    }

    resetDialog(): void {
        this.resetFieldGroup(this.data.fieldGroup || [])
        this.toastr.info(`${this.data.props?.label} values have been reset to their defaults.`, '', {
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
