import { Injectable } from '@angular/core'
import { StorageService } from '../../storage.service'
import { ArtifactService } from '../artifact/artifact.service'

@Injectable({
    providedIn: 'root'
})
export class ArtifactViewerService {
    constructor(
        private artifactService: ArtifactService,
        private storageService: StorageService
    ) {}
    isViewerVisible = false
    minimised = false
    name: string | null = null

    setName(name: string | null): void {
        this.name = name
    }

    closeArtifactViewer(): void {
        this.resetArtifacts()
        this.storageService.clearActiveArtifact()
        this.isViewerVisible = false
    }

    resetArtifacts(): void {
        this.artifactService.resetAllSubjects()
    }
}
