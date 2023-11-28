import {Component, HostListener} from '@angular/core'
import {NotificationService} from './notification.service'

@Component({
    selector: 'app-runs',
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.scss']
})
export class NotificationComponent {

    constructor(private notificationService: NotificationService) {
    }

    @HostListener('window:beforeunload')
    beforeUnload() {
        this.notificationService.closeWebSocket()
    }
}
