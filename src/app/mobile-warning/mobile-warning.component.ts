import { Component } from '@angular/core'

@Component({
    selector: 'app-mobile-warning',
    templateUrl: './mobile-warning.component.html',
    styleUrls: ['./mobile-warning.component.scss']
})
export class MobileWarningComponent {
    isMobile = window.innerWidth < 768

    dismissWarning() {
        this.isMobile = false
    }
}
