import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop'
import { Component, DestroyRef, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { TranslocoModule } from '@jsverse/transloco'
import { LucideGripHorizontal, LucideMaximize2, LucideMinimize2, LucideX } from '@lucide/angular'
import { TippyDirective } from '@ngneat/helipopper'
import { ArtifactComponent } from '../artifact/artifact.component'
import { ArtifactService } from '../artifact/artifact.service'
import { ArtifactViewerService } from './artifact-viewer.service'

@Component({
    selector: 'app-artifact-viewer',
    imports: [
        CdkDrag,
        CdkDragHandle,
        LucideGripHorizontal,
        LucideMaximize2,
        LucideMinimize2,
        LucideX,
        TippyDirective,
        ArtifactComponent,
        TranslocoModule
    ],
    templateUrl: './artifact-viewer.component.html',
    styleUrl: './artifact-viewer.component.scss'
})
export class ArtifactViewerComponent {
    artifactViewerService = inject(ArtifactViewerService)
    artifactService = inject(ArtifactService)
    private destroyRef = inject(DestroyRef)

    dragPosition = { x: 0, y: 0 }

    constructor() {
        this.artifactViewerService.isViewerVisible$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(isVisible => {
            if (!isVisible) this.dragPosition = { x: 0, y: 0 }
        })
    }

    toggleMinimise(): void {
        this.artifactViewerService.minimised = !this.artifactViewerService.minimised
    }

    closeArtifactViewer(): void {
        this.artifactViewerService.closeArtifactViewer()
    }
}
