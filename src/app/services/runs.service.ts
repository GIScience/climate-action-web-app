import {Injectable} from '@angular/core';
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';
import {environment} from "../../environments/environment";
import {PluginRun} from "../models/plugin.interface";
import {BehaviorSubject} from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class RunsService {

    private apiUrl = environment.climateActionWSUrl;
    private websocketSubject!: WebSocketSubject<any>;

    private runsSub = new BehaviorSubject<Array<PluginRun>>([])
    pluginListObs = this.runsSub.asObservable()

    constructor() {
    }

    startWebSocket() {
        this.websocketSubject = webSocket(`${this.apiUrl}/computation/`)
        return this.websocketSubject.asObservable();
    }

    public sendMessage(message: any): void {
        if (this.websocketSubject) {
            this.websocketSubject.next(message);
        } else {
            console.error("WebSocket connection is not established.");
        }
    }

    public closeWebSocket() {
        this.websocketSubject.complete();
    }
}
