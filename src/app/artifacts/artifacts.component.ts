import {Component, OnInit} from '@angular/core';
import {PluginService} from "../services/plugin.service";
import {ArtifactType} from "../models/artifact.interface";
import {ReportService} from "../services/report.service";

@Component({
    selector: 'app-artifacts',
    templateUrl: './artifacts.component.html',
    styleUrls: ['./artifacts.component.scss']
})
export class ArtifactsComponent implements OnInit {

    artifacts: Array<ArtifactType> = []
    artifactIds: string[] | undefined;

    constructor(private pluginService: PluginService,
                private reportService: ReportService) {
    }

    ngOnInit(): void {
        this.fetchArtifactIds()
    }

    fetchArtifactIds() {
        // Fetch the artifact IDs from local storage as an array
        this.artifactIds = this.pluginService.getComputeIds()
        if (!this.artifactIds)
            return

        this.artifactIds.forEach(id => {
            // console.log('artifactId ', id)
            this.fetchArtifact(id)
        })
    }

    fetchArtifact(currentArtifactId: string) {
        // Call the API to get artifact content for the current ID
        this.pluginService.getArtifacts(currentArtifactId).subscribe({
            next: (data) => {
                if (Array.isArray(data) && data.length > 0) {
                    // Update the artifacts with the response data
                    if (!data)
                        return

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
                } else {
                    // Retry after 30 seconds
                    setTimeout(() => this.fetchArtifact(currentArtifactId), 30000);
                }
            },
            error: error => {
                console.error('Error fetching getArtifacts: ', currentArtifactId, error);
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
