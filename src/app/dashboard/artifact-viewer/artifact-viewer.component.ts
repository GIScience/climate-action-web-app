import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop'
import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { TippyDirective } from '@ngneat/helipopper'
import { Download, GripHorizontal, LucideAngularModule, Maximize2, Minimize2, X } from 'lucide-angular'
import { ArtifactComponent } from '../artifact/artifact.component'
import { ArtifactService } from '../artifact/artifact.service'
import { ArtifactViewerService } from './artifact-viewer.service'

@Component({
    selector: 'app-artifact-viewer',
    standalone: true,
    imports: [CommonModule, CdkDrag, CdkDragHandle, LucideAngularModule, TippyDirective, ArtifactComponent],
    templateUrl: './artifact-viewer.component.html',
    styleUrl: './artifact-viewer.component.scss'
})
export class ArtifactViewerComponent {
    readonly GripHorizontal = GripHorizontal
    readonly Download = Download
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

    downloadContent(): void {
        if (this.artifactService.downloadJsonHref) {
            const a = document.createElement('a')
            document.body.appendChild(a)
            a.style.display = 'none'
            a.href = (
                this.artifactService.downloadJsonHref as { changingThisBreaksApplicationSecurity: string }
            ).changingThisBreaksApplicationSecurity
            a.download = 'data.json'
            a.click()
            document.body.removeChild(a)
        } else if (this.artifactService.currentUrl) {
            const a = document.createElement('a')
            a.href = this.artifactService.currentUrl
            a.download = this.getFileName(this.artifactService.currentUrl)
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        }
    }

    private getFileName(url: string): string {
        return url.split('/').pop() || 'download'
    }

    closeArtifactViewer(): void {
        this.artifactViewerService.closeArtifactViewer()
    }
}
