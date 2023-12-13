import {Component, HostListener, OnDestroy, OnInit} from '@angular/core'
import {NotificationService} from './notification.service'
import {Subscription} from 'rxjs'
import {PluginService} from '../plugin/plugin.service'
import {Status} from '../plugin/plugin.interface'

@Component({
    selector: 'app-runs',
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {

    private sync?: Subscription

    constructor(private notificationService: NotificationService, private pluginService: PluginService) {
    }

    ngOnInit() {
        this.sync = this.notificationService.startWebSocket().subscribe({
            next: (message) => {
                switch (message.type) {
                    case undefined:
                    case 'computation_status': {
                        if (message.correlation_uuid) {
                            this.pluginService.updateRunStatus(message.correlation_uuid, message.status as Status)
                        }
                    }
                }
            },
            error: (error) => console.error('WebSocket error:', error),
            complete: () => console.debug('WebSocket connection closed')
        })
    }

    ngOnDestroy() {
        this.sync?.unsubscribe()
    }

    @HostListener('window:beforeunload')
    beforeUnload() {
        this.notificationService.closeWebSocket()
    }
}
