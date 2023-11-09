import {Component, OnInit} from '@angular/core';
import {PluginService} from "../services/plugin.service";

@Component({
    selector: 'app-artifacts',
    templateUrl: './artifacts.component.html',
    styleUrls: ['./artifacts.component.scss']
})
export class ArtifactsComponent implements OnInit {

    constructor(private pluginService: PluginService) {}

    ngOnInit(): void {
        // check for locationStorage for any correlation_id been stored
        const artifactIds: string[] = this.pluginService.getComputeIds()
        // get artifacts list
        artifactIds.forEach(artifactId => {
            // this.artifacts.push()
            this.pluginService.getArtifacts(artifactId).subscribe({
                next: (data) => {
                    console.log('response from getArtifacts for artifactId ', artifactId, data)
                },
                error: error => {
                    console.error('Error fetching getArtifacts: ', artifactId, error);
                }
            })
        })
    }
}
