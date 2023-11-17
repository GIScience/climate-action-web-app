import {Component, OnInit} from '@angular/core';
import {PluginService} from "../services/plugin.service";
import {ArtifactType} from "../models/artifact.interface";
import {ReportService} from "../services/report.service";
import {PluginRun} from "../models/plugin.interface";

@Component({
    selector: 'app-artifacts',
    templateUrl: './artifacts.component.html',
    styleUrls: ['./artifacts.component.scss']
})
export class ArtifactsComponent implements OnInit {

    artifacts: Array<ArtifactType> = []
    currentRuns!: PluginRun[];

    constructor(private pluginService: PluginService,
                private reportService: ReportService) {
    }

    ngOnInit(): void {
        this.fetchArtifactIds()
    }

    fetchArtifactIds() {
        // Fetch the artifact IDs from local storage as an array
        this.currentRuns = this.pluginService.getComputes()
        this.currentRuns.forEach(currentRun => {
            this.fetchArtifact(currentRun.correlation_id)
        })
    }

    fetchArtifact(correlation_id: string) {
        // Call the API to get artifact content for the current ID
        this.pluginService.getArtifacts(correlation_id).subscribe({
            next: (data: ArtifactType[]) => {
                if (!data)
                    return
                if (Array.isArray(data) && data.length > 0) {
                    // assign icon based on their modality
                    const icons = {
                        'IMAGE': 'ti-image',
                        'MARKDOWN': 'ti-align-left',
                        'CHART': 'ti-stats-up',
                        'TABLE': 'ti-layout-grid3',
                        'MAP_LAYER_GEOJSON': 'ti-map-alt',
                        'MAP_LAYER_GEOTIFF': 'ti-map-alt'
                    }
                    data = data.map((d) => {
                        d.icon = (icons[d.modality] ?? 'ti-file') as ArtifactType['icon']
                        return d
                    })
                    this.artifacts.push(...data);
                    this.pluginService.updateRunStatus(correlation_id, "completed")
                } else {
                    // Retry after 30 seconds
                    setTimeout(() => this.fetchArtifact(correlation_id), 30000);
                    this.pluginService.updateRunStatus(correlation_id, "in-progress")
                }
            },
            error: error => {
                console.error('Error fetching getArtifacts: ', correlation_id, error);
                // update the status of correlation as failed
                this.pluginService.updateRunStatus(correlation_id, "failed")
            }
        })
    }

    addArtifactToReport(artifact: ArtifactType) {
        switch (artifact.modality) {
            case 'IMAGE':
                this.reportService.getImage(artifact)
                break;
            case 'MARKDOWN':
                this.reportService.getMarkdown(artifact)
                break;
            case 'CHART':
                this.reportService.getChart(artifact)
                break;
            case 'TABLE':
                this.reportService.getTable(artifact)
                break;
            case 'MAP_LAYER_GEOJSON':
                this.reportService.getGeoJson(artifact)
                break;
            case 'MAP_LAYER_GEOTIFF':
                this.reportService.getGeoTiff(artifact)
                break;
        }
    }

}
