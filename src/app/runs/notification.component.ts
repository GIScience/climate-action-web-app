import {Component, HostListener} from '@angular/core';
import {PluginService} from "../services/plugin.service";
import {PluginRun} from "../plugin/plugin.interface";
import {NotificationService} from "./notification.service";
import moment from "moment";

@Component({
    selector: 'app-runs',
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.scss']
})
export class NotificationComponent {

    runs!: Array<PluginRun>

    constructor(private runsService: NotificationService,
                private pluginService: PluginService) {

        this.pluginService.getPluginRuns().subscribe((runs) => {
            this.runs = runs;
        });

        this.runsService.startWebSocket().subscribe({
            next: (message) => {
                switch (message.type) {
                    case undefined:
                    case "computation_status": {
                        const run = this.runs.find(x => x.correlation_id === message.correlation_uuid)
                        if (run) run.status = message.status
                    }
                }
            },
            error: (error) => console.error('WebSocket error:', error),
            complete: () => console.info('WebSocket connection closed')
        })
        this.keepAlive()
    }

    private keepAlive() {
        setInterval(() => {
            this.runsService.sendMessage({
                "type": "heartbeat",
                "timestamp": moment(new Date()).format()
            })
        }, 5000)
    }

    getStatusClass(status: "scheduled" | "in-progress" | "completed" | "failed" | "wrong-input" | undefined) {
        const statusClassMap = {
            'completed': 'text-bg-success',
            'scheduled': 'text-bg-primary',
            'in-progress': 'text-bg-primary',
            'failed': 'text-bg-danger',
            'wrong-input': 'text-bg-warning',
        }
        return status ? statusClassMap[status] : 'text-bg-secondary';
    }

    @HostListener('window:beforeunload')
    beforeUnload() {
        this.runsService.closeWebSocket()
    }
}
