import { Injectable } from '@angular/core'
import { ArtifactService } from '../artifact/artifact.service'

@Injectable({
    providedIn: 'root'
})
export class ArtifactViewerService {
    constructor(private artifactService: ArtifactService) {}
    isViewerVisible = false
    minimised = false
    name: string | null = null

    setName(name: string | null): void {
        this.name = name
    }

    closeArtifactViewer(): void {
        this.resetArtifacts()
        localStorage.setItem('active_artifact', '[]')
        this.isViewerVisible = false
    }

    resetArtifacts(): void {
        this.artifactService.resetAllSubjects()
    }
}
