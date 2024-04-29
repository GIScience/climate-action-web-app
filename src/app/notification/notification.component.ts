import {Component, HostListener, OnDestroy, OnInit} from '@angular/core'
import {NotificationService} from './notification.service'
import {Subscription} from 'rxjs'
import {PluginService} from '../plugin/plugin.service'
import {Status} from '../plugin/plugin.interface'
import {WSMessage} from './notification.interface'
import moment from 'moment'
import {MatListModule} from '@angular/material/list'
import {MatIconModule} from '@angular/material/icon'
import {CommonModule} from '@angular/common'
import {TuiDropdownModule} from '@taiga-ui/core'
import {TuiActiveZoneModule} from '@taiga-ui/cdk'

@Component({
    selector: 'app-runs',
    templateUrl: './notification.component.html',
    imports: [
        MatIconModule,
        MatListModule,
        CommonModule,
        TuiDropdownModule,
        TuiActiveZoneModule
    ],
    styleUrls: ['./notification.component.scss'],
    standalone: true
})
export class NotificationComponent implements OnInit, OnDestroy {

    newNotifications = 0
    readonly MAX_LOG_ITEMS: number = 10
    readonly NOTIFICATION_LOG = 'notification_log'
    protected readonly moment = moment
    protected notificationLog: WSMessage[] = []
    private sync?: Subscription
    open = false

    onClick(): void {
        this.open = !this.open
    }

    onActiveZone(active: boolean): void {
        this.open = active && this.open
    }

    constructor(private notificationService: NotificationService, private pluginService: PluginService) {
    }

    ngOnInit() {
        this.syncNotificationLog()

        this.sync = this.notificationService.startWebSocket().subscribe({
            next: (message: WSMessage) => {
                switch (message.type) {
                    case undefined:
                    case 'computation_status': {
                        if (message.correlation_uuid) {
                            this.pluginService.updateRunStatus(message.correlation_uuid, message.status as Status)
                            this.updateNotificationLog(message)
                            this.syncNotificationLog()
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

    updateNotificationLog(message: WSMessage) {
        const messageLog = this.getNotificationLog()
        this.newNotifications += 1

        messageLog.push(message)
        if (messageLog.length > this.MAX_LOG_ITEMS)
            messageLog.shift()

        localStorage.setItem(this.NOTIFICATION_LOG, JSON.stringify(messageLog))
    }

    getNotificationLog() {
        const persisted_message_log = localStorage.getItem(this.NOTIFICATION_LOG)
        if (persisted_message_log) {
            return JSON.parse(persisted_message_log) as WSMessage[]
        } else {
            return []
        }
    }

    syncNotificationLog() {
        this.notificationLog = this.getNotificationLog()
    }
}
