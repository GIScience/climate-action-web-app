import { Injectable } from '@angular/core'
import { ArtifactViewerService } from './artifact-viewer/artifact-viewer.service'
import { MapService } from './map/map.service'
import { PluginService } from './plugin/plugin.service'
import { ReportService } from './report/report.service'

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    constructor(
        private artifactViewerService: ArtifactViewerService,
        private mapService: MapService,
        private reportService: ReportService,
        private pluginService: PluginService
    ) {}

    clearDashboardState() {
        const searchInput = document.querySelector('input.search-locations') as HTMLInputElement
        if (searchInput) {
            searchInput.value = ''
            searchInput.dispatchEvent(new Event('input'))
        }

        this.artifactViewerService.closeArtifactViewer()
        this.pluginService.setComputeState('inactive')
        this.mapService.removeFocusedLayer()
        this.mapService.removeComputeLayers()
        this.reportService.closeReport()
        this.reportService.collapseLeftColumn(false)
    }
}
