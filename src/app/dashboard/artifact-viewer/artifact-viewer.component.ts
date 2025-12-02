import { Component } from '@angular/core'
import { TranslocoModule } from '@jsverse/transloco'
import { TippyDirective } from '@ngneat/helipopper'
import { GripHorizontal, LucideAngularModule, Maximize2, Minimize2, X } from 'lucide-angular'
import { ArtifactComponent } from '../artifact/artifact.component'
import { ArtifactService } from '../artifact/artifact.service'
import { ArtifactViewerService } from './artifact-viewer.service'

@Component({
    selector: 'app-artifact-viewer',
    imports: [LucideAngularModule, TippyDirective, ArtifactComponent, TranslocoModule],
    templateUrl: './artifact-viewer.component.html',
    styleUrl: './artifact-viewer.component.scss'
})
export class ArtifactViewerComponent {
    readonly GripHorizontal = GripHorizontal
    readonly Maximize2 = Maximize2
    readonly Minimize2 = Minimize2
    readonly X = X

    constructor(
        public artifactViewerService: ArtifactViewerService,
        public artifactService: ArtifactService
    ) {}

    toggleMinimise(): void {
        this.artifactViewerService.minimised = !this.artifactViewerService.minimised
    }

    closeArtifactViewer(): void {
        this.artifactViewerService.closeArtifactViewer()
    }
}
