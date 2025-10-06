import { NgIf } from '@angular/common'
import { Component } from '@angular/core'
import { TranslocoModule } from '@jsverse/transloco'

@Component({
    selector: 'app-mobile-warning',
    templateUrl: './mobile-warning.component.html',
    styleUrls: ['./mobile-warning.component.scss'],
    imports: [NgIf, TranslocoModule]
})
export class MobileWarningComponent {
    isMobile = window.innerWidth < 768

    dismissWarning() {
        this.isMobile = false
    }
}
