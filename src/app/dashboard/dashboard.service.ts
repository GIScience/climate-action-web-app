import { Injectable, inject } from '@angular/core'
import { ArtifactViewerService } from './artifact-viewer/artifact-viewer.service'
import { MapArtifactManagerService } from './map/map-artifact-manager.service'
import { MapService } from './map/map.service'
import { PluginService } from './plugin/plugin.service'
import { ReportService } from './report/report.service'

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private artifactViewerService = inject(ArtifactViewerService)
    private mapService = inject(MapService)
    private reportService = inject(ReportService)
    private pluginService = inject(PluginService)
    private mapArtifactManager = inject(MapArtifactManagerService)

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
        this.mapArtifactManager.clearAll()
        this.reportService.closeReport()
        this.reportService.collapseLeftColumn(false)
    }
}
