import { Component, DoCheck, ViewContainerRef, inject } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { TranslocoModule } from '@jsverse/transloco'
import { LucideListTodo } from '@lucide/angular'
import { FieldType } from '@ngx-formly/core'
import { DialogWindowComponent } from './dialog-window.component'
@Component({
    selector: 'app-optional-attributes-type',
    templateUrl: './optional-attributes.type.component.html',
    styleUrls: ['./optional-attributes.type.component.scss'],
    imports: [LucideListTodo, TranslocoModule]
})
export class OptionalAttributesTypeComponent extends FieldType implements DoCheck {
    private dialog = inject(MatDialog)
    private viewContainerRef = inject(ViewContainerRef)

    isDisabled = false

    ngDoCheck() {
        const currentFormDisabled = this.form && this.form.disabled
        this.isDisabled = currentFormDisabled || false
    }

    openDialog() {
        this.dialog.open(DialogWindowComponent, {
            width: '600px',
            data: this.field.fieldGroup?.[0],
            autoFocus: false,
            maxHeight: '90vh',
            disableClose: true,
            viewContainerRef: this.viewContainerRef
        })
    }
}
