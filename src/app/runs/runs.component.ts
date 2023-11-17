import {Component, OnInit} from '@angular/core';
import {PluginService} from "../services/plugin.service";
import {PluginRun} from "../models/plugin.interface";
import {RunsService} from "../services/runs.service";

@Component({
    selector: 'app-runs',
    templateUrl: './runs.component.html',
    styleUrls: ['./runs.component.scss']
})
export class RunsComponent {

    runs!: Array<PluginRun>

    constructor(private runsService: RunsService,
                private pluginService: PluginService) {

        this.pluginService.getPluginRuns().subscribe((runs) => {
            this.runs = runs;
        });

        this.runsService.startWebSocket().subscribe({
            next: (message: any) => {
                // Handle the received message, update your application state, etc.
                if (!message)
                    return
                if (message['correlation_uuid']) {

                    // filter message for each runs
                    let run = this.runs.find(obj => obj.correlation_id === message['correlation_uuid'])
                    if (run)
                        run.status = message['status']
                }
            },
            error: (error: any) => console.error('WebSocket error:', error),
            complete: () => console.log('WebSocket connection closed')
        })

        this.keepItAlive()
    }

    private keepItAlive() {
        setInterval(() => {
            // send "A"
            this.runsService.sendMessage(new Uint8Array([65]))
        }, 9000)
    }

    getStatusClass(status: "scheduled" | "in-progress" | "completed" | "failed" | "wrong-input" | undefined) {
        const statusClassMap = {
            'completed': 'text-bg-success',
            'scheduled': 'text-bg-primary',
            'in-progress': 'text-bg-primary',
            'failed': 'text-bg-danger',
            'wrong-input': 'text-bg-warning',
        };

        return status ? statusClassMap[status] : 'text-bg-secondary';
    }
}
