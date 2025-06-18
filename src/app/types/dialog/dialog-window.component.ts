import { CommonModule } from '@angular/common'
import { Component, Inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core'
import { CircleX, LucideAngularModule } from 'lucide-angular'
import { NgScrollbarModule } from 'ngx-scrollbar'

@Component({
    selector: 'app-dialog-window',
    imports: [CommonModule, FormlyModule, MatDialogModule, MatButtonModule, LucideAngularModule, NgScrollbarModule],
    templateUrl: './dialog-window.component.html',
    styleUrls: ['./dialog-window.component.scss']
})
export class DialogWindowComponent {
    constructor(
        public dialogRef: MatDialogRef<DialogWindowComponent>,
        @Inject(MAT_DIALOG_DATA) public data: FormlyFieldConfig
    ) {}

    readonly CircleX = CircleX

    closeDialog(): void {
        this.dialogRef.close()
    }
}
