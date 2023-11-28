import {Injectable} from '@angular/core'
import {webSocket, WebSocketSubject} from 'rxjs/webSocket'
import {environment} from "../../environments/environment"
import {WSMessage} from "./notification.interface"
import {map, Observable} from "rxjs"
import moment from "moment/moment";


@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    private wsUrl = environment.climateActionWSUrl
    private websocketSubject!: WebSocketSubject<string>

    startWebSocket(): Observable<WSMessage> {
        if (!this.websocketSubject) {
            this.websocketSubject = webSocket(`${this.wsUrl}/api/v1/gateway/computation/`)
        }
        this.keepAlive()
        return this.websocketSubject.asObservable().pipe(map((x) => JSON.parse(x) as WSMessage))
    }

    public sendMessage(message: WSMessage): void {
        if (this.websocketSubject) {
            this.websocketSubject.next(JSON.stringify(message))
        } else {
            console.error("WebSocket connection has not bee established.")
        }
    }

    public closeWebSocket() {
        if (this.websocketSubject) {
            this.websocketSubject.complete()
        }
    }

    private keepAlive() {
        setInterval(() => {
            this.sendMessage({
                "type": "heartbeat",
                "timestamp": moment(new Date()).format()
            })
        }, 5000)
    }

}