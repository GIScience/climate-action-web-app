import {Component, Input} from '@angular/core'
import {CommonModule} from '@angular/common'
import {MarkdownModule} from 'ngx-markdown'

@Component({
    selector: 'app-markdown',
    standalone: true,
    imports: [
        CommonModule,
        MarkdownModule
    ],
    templateUrl: './markdown.component.html',
    styleUrls: ['./markdown.component.scss']
})
export class MarkdownComponent {
    @Input() url: string | undefined
}
