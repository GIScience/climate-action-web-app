import {Injectable} from '@angular/core'
import {webSocket, WebSocketSubject} from 'rxjs/webSocket'
import {environment} from "../../environments/environment"
import {WSMessage} from "./notification.interface"
import {Observable} from "rxjs"


@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    private wsUrl = environment.climateActionWSUrl
    private websocketSubject!: WebSocketSubject<WSMessage>

    startWebSocket(): Observable<WSMessage> {
        if (!this.websocketSubject) {
            this.websocketSubject = webSocket(`${this.wsUrl}/api/v1/gateway/computation/`)
        }
        return this.websocketSubject.asObservable()
    }

    public sendMessage(message: WSMessage): void {
        if (this.websocketSubject) {
            this.websocketSubject.next(message)
        } else {
            console.error("WebSocket connection has not bee established.")
        }
    }

    public closeWebSocket() {
        if (this.websocketSubject) {
            this.websocketSubject.complete()
        }
    }
}