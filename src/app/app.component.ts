import {AfterViewInit, Component} from '@angular/core'
import * as bootstrap from 'bootstrap'
import {ToastService} from './toast/toast.service'
import {default as packageInfo} from '../../package.json'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
    title = 'Climate Action Platform'
    name = 'HeiGIT'
    version: string = packageInfo.version

    constructor(private toastService: ToastService) {
    }

    ngAfterViewInit(): void {
        // enble tooltip
        const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl, {trigger: 'hover'}))
    }

}
