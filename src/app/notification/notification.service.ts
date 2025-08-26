// Unused for now, will restore once the websocket is re-enabled.

import { Injectable } from '@angular/core'
import { environment } from '@environments/environment'
import { formatISO } from 'date-fns'
import { map, Observable } from 'rxjs'
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import { WSMessage } from './notification.interface'

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private wsUrl = environment.climateActionWSUrl
    private websocketSubject?: WebSocketSubject<string>
    private hearbeat?: NodeJS.Timeout

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

    private keepAlive(): NodeJS.Timeout {
        return setInterval(() => {
            this.sendMessage({
                type: 'heartbeat',
                timestamp: formatISO(new Date())
            })
        }, 5000)
    }
}
