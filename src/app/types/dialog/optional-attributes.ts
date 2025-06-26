import { CommonModule } from '@angular/common'
import { Component, DoCheck } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { FieldType } from '@ngx-formly/core'
import { ListTodo, LucideAngularModule } from 'lucide-angular'
import { DialogWindowComponent } from './dialog-window.component'

@Component({
    selector: 'app-optional-attributes-type',
    templateUrl: './optional-attributes.type.component.html',
    styleUrls: ['./optional-attributes.type.component.scss'],
    imports: [LucideAngularModule, CommonModule]
})
export class OptionalAttributesTypeComponent extends FieldType implements DoCheck {
    isDisabled = false

    constructor(private dialog: MatDialog) {
        super()
    }

    readonly ListTodo = ListTodo

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
            disableClose: true
        })
    }
}
