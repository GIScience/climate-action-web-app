import { Component, Input } from '@angular/core'

@Component({
    selector: 'app-image',
    imports: [],
    templateUrl: './image.component.html',
    styleUrls: ['./image.component.scss']
})
export class ImageComponent {
    @Input() url: string | undefined
}
