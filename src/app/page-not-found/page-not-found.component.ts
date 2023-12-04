import {Component} from '@angular/core'
import {NgOptimizedImage} from '@angular/common'

@Component({
    selector: 'app-page-not-found',
    templateUrl: './page-not-found.component.html',
    styleUrls: ['./page-not-found.component.scss'],
    imports: [
        NgOptimizedImage
    ],
    standalone: true
})
export class PageNotFoundComponent {

}
