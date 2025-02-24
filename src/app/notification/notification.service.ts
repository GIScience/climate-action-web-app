// Unused for now, will restore once the websocket is re-enabled.

import { Injectable } from '@angular/core'
import moment from 'moment/moment'
import { map, Observable } from 'rxjs'
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import { environment } from '@environments/environment'
import { WSMessage } from './notification.interface'

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private wsUrl = environment.climateActionWSUrl
    private websocketSubject?: WebSocketSubject<string>
    private hearbeat?: number

    startWebSocket(): Observable<WSMessage> {
        if (!this.websocketSubject) {
            this.websocketSubject = webSocket(`${this.wsUrl}/api/v1/gateway/computation/`)
            this.hearbeat = this.keepAlive()
        }
        return this.websocketSubject.asObservable().pipe(map(x => JSON.parse(x) as WSMessage))
    }

    public sendMessage(message: WSMessage): void {
        if (this.websocketSubject) {
            this.websocketSubject.next(JSON.stringify(message))
        } else {
            console.error('WebSocket connection has not been established.')
        }
    }

    public closeWebSocket() {
        if (this.websocketSubject) {
            clearInterval(this.hearbeat)
            this.websocketSubject.complete()
            this.websocketSubject = undefined
        }
    }

    private keepAlive(): number {
        return setInterval(() => {
            this.sendMessage({
                type: 'heartbeat',
                timestamp: moment(new Date()).format()
            })
        }, 5000)
    }
}
