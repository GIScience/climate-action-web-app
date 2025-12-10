import { Component, inject } from '@angular/core'
import { Router } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'

@Component({
    selector: 'app-page-not-found',
    templateUrl: './page-not-found.component.html',
    styleUrls: ['./page-not-found.component.scss'],
    imports: [TranslocoModule]
})
export class PageNotFoundComponent {
    private router = inject(Router)

    goToDashboard() {
        this.router.navigate(['/dashboard'])
    }
}
