import { Component, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { TranslocoModule } from '@jsverse/transloco'
import { ChevronRight, LucideAngularModule, X } from 'lucide-angular'

export interface RegionChoiceOption {
    id: string
    name: string
    adminLevel: number
}

export interface RegionChoiceDialogData {
    options: RegionChoiceOption[]
}

@Component({
    selector: 'app-region-choice-dialog',
    imports: [MatDialogModule, MatButtonModule, LucideAngularModule, TranslocoModule],
    templateUrl: './region-choice-dialog.component.html',
    styleUrls: ['./region-choice-dialog.component.scss']
})
export class RegionChoiceDialogComponent {
    dialogRef = inject<MatDialogRef<RegionChoiceDialogComponent, RegionChoiceOption>>(MatDialogRef)
    data = inject<RegionChoiceDialogData>(MAT_DIALOG_DATA)

    readonly X = X
    readonly ChevronRight = ChevronRight

    readonly osmWikiAdminLevelUrl =
        'https://wiki.openstreetmap.org/wiki/Tag:boundary%3Dadministrative#Table_:_Admin_level_for_all_countries'

    closeDialog(): void {
        this.dialogRef.close(undefined)
    }

    select(option: RegionChoiceOption): void {
        this.dialogRef.close(option)
    }
}
