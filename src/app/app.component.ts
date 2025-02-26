import { Component } from '@angular/core'
import { default as packageInfo } from '../../package.json'
import { ArtifactViewerService } from './dashboard/artifact-viewer/artifact-viewer.service'
import { MapService } from './dashboard/map/map.service'
import { ReportService } from './dashboard/report/report.service'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'Climate Action Platform'
    name = 'HeiGIT'
    version: string = packageInfo.version

    currentYear(): number {
        return new Date().getFullYear()
    }

    constructor(
        public artifactViewerService: ArtifactViewerService,
        public mapService: MapService,
        public reportService: ReportService
    ) {}

    clearDashboardState() {
        this.artifactViewerService.closeArtifactViewer()
        this.mapService.removeFocusedLayer()
        this.mapService.removeComputeLayers()
        this.reportService.closeReport()
        this.reportService.collapseLeftColumn(false)
    }
}
