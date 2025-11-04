import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { StorageService } from '../../storage.service'
import { ArtifactService } from '../artifact/artifact.service'

@Injectable({
    providedIn: 'root'
})
export class ArtifactViewerService {
    private isViewerVisibleSubject = new BehaviorSubject<boolean>(false)
    isViewerVisible$ = this.isViewerVisibleSubject.asObservable()

    minimised = false
    name: string | null = null

    constructor(
        private artifactService: ArtifactService,
        private storageService: StorageService
    ) {}

    get isViewerVisible(): boolean {
        return this.isViewerVisibleSubject.value
    }

    set isViewerVisible(value: boolean) {
        this.isViewerVisibleSubject.next(value)
    }

    setName(name: string | null): void {
        this.name = name
    }

    closeArtifactViewer(): void {
        this.artifactService.resetAllSubjects()
        this.storageService.clearActiveArtifact()
        this.isViewerVisible = false
    }
}
