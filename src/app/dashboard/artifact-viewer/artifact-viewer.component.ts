import { Component, inject } from '@angular/core'
import { TranslocoModule } from '@jsverse/transloco'
import { LucideMaximize2, LucideMinimize2, LucideX } from '@lucide/angular'
import { TippyDirective } from '@ngneat/helipopper'
import { ArtifactComponent } from '../artifact/artifact.component'
import { ArtifactService } from '../artifact/artifact.service'
import { ArtifactViewerService } from './artifact-viewer.service'

@Component({
    selector: 'app-artifact-viewer',
    imports: [LucideMaximize2, LucideMinimize2, LucideX, TippyDirective, ArtifactComponent, TranslocoModule],
    templateUrl: './artifact-viewer.component.html',
    styleUrl: './artifact-viewer.component.scss'
})
export class ArtifactViewerComponent {
    artifactViewerService = inject(ArtifactViewerService)
    artifactService = inject(ArtifactService)

    toggleMinimise(): void {
        this.artifactViewerService.minimised = !this.artifactViewerService.minimised
    }

    closeArtifactViewer(): void {
        this.artifactViewerService.closeArtifactViewer()
    }
}
