import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
    Type,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
    inject
} from '@angular/core'
import { MatExpansionModule } from '@angular/material/expansion'
import { DomSanitizer } from '@angular/platform-browser'
import { TranslocoModule } from '@jsverse/transloco'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { MapArtifactManagerService } from '../map/map-artifact-manager.service'
import { Artifact } from './artifact.interface'
import { ArtifactService } from './artifact.service'

@Component({
    selector: 'app-artifact',
    templateUrl: './artifact.component.html',
    styleUrls: ['./artifact.component.scss'],
    imports: [MatExpansionModule, NgScrollbarModule, TranslocoModule],
    encapsulation: ViewEncapsulation.None
})
export class ArtifactComponent implements OnInit, AfterViewInit, OnDestroy {
    private defaultArtifactService = inject(ArtifactService)
    private sanitizer = inject(DomSanitizer)
    private changeDetector = inject(ChangeDetectorRef)
    private mapArtifactManager = inject(MapArtifactManagerService)

    @ViewChild('container', { read: ViewContainerRef })
    container!: ViewContainerRef
    @ViewChild('descriptionContainer', { read: ViewContainerRef })
    descriptionContainer!: ViewContainerRef
    @ViewChild('mapArtifactContainer', { read: ViewContainerRef })
    mapArtifactContainer!: ViewContainerRef

    @Input() artifact?: Artifact
    @Input() artifactService?: ArtifactService
    @Input() enableMapHost = false

    summary: string | null = null
    description: string | null = null
    showAccordion = false
    modality: string | null = null
    private artifactRenderVersion = 0
    private destroyed = false

    private getService(): ArtifactService {
        return this.artifactService || this.defaultArtifactService
    }

    display<C>(componentType: Type<C>, name: string, value: unknown, artifact: Artifact | null) {
        this.container.clear()

        const ref = this.container.createComponent(componentType)
        ref.setInput(name, value)

        this.displaySummary(artifact?.summary || null)
        this.displayDescription(artifact?.description || null)

        const service = this.getService()
        if (typeof value === 'object' && value && !(value as { url?: string }).url) {
            this.generateDownloadJsonUri(value)
            service.currentUrl = null
        } else {
            service.currentUrl = typeof value === 'string' ? value : (value as { url?: string })?.url || null
            service.downloadJsonHref = null
        }
        this.refreshAccordion()
    }

    generateDownloadJsonUri(jsonData: object) {
        const theJSON = JSON.stringify(jsonData)
        this.getService().downloadJsonHref = this.sanitizer.bypassSecurityTrustUrl(
            'data:application/json;charset=UTF-8,' + encodeURIComponent(theJSON)
        )
    }

    private displaySummary(summary: string | null) {
        this.summary = summary
    }

    private displayDescription(description: string | null) {
        this.description = description
        this.showAccordion = false
        this.detectChanges()
        this.showAccordion = true
    }

    refreshAccordion() {
        this.showAccordion = false
        this.detectChanges()
        this.showAccordion = true
    }

    ngOnInit(): void {
        if (this.artifact) {
            this.modality = this.artifact.modality
            this.getService().fetchArtifact(this.artifact)
        }

        const service = this.getService()
        service.markdown.subscribe(async v => {
            const renderVersion = this.beginArtifactRender()
            if (!v) {
                this.clearContainer()
                return
            }
            const { MarkdownComponent } = await import('./markdown/markdown.component')
            if (!this.isCurrentArtifactRender(renderVersion)) return
            this.display(MarkdownComponent, 'url', v.url, v)
        })
        service.image.subscribe(async v => {
            const renderVersion = this.beginArtifactRender()
            if (!v) {
                this.clearContainer()
                return
            }
            const { ImageComponent } = await import('./image/image.component')
            if (!this.isCurrentArtifactRender(renderVersion)) return
            this.display(ImageComponent, 'url', v.url, v)
        })
        service.table.subscribe(async v => {
            const renderVersion = this.beginArtifactRender()
            if (!v) {
                this.clearContainer()
                return
            }
            const { TableComponent } = await import('./table/table.component')
            if (!this.isCurrentArtifactRender(renderVersion)) return
            this.display(TableComponent, 'url', v.url, v)
        })
        service.vector.subscribe(v => {
            this.beginArtifactRender()
            if (!v) this.clearContainer()
        })
        service.raster.subscribe(v => {
            this.beginArtifactRender()
            if (!v) this.clearContainer()
        })
        service.chart.subscribe(async v => {
            const renderVersion = this.beginArtifactRender()
            if (!v.data) {
                this.clearContainer()
                return
            }
            const { ChartComponent } = await import('./chart/chart.component')
            if (!this.isCurrentArtifactRender(renderVersion)) return
            this.display(ChartComponent, 'inputData', { data: v.data, artifact: v }, v.artifact)
        })
        service.plotlyChart.subscribe(async v => {
            const renderVersion = this.beginArtifactRender()
            if (!v.data) {
                this.clearContainer()
                return
            }
            const { PlotlyChartComponent } = await import('./plotly-chart/plotly-chart.component')
            if (!this.isCurrentArtifactRender(renderVersion)) return
            this.display(PlotlyChartComponent, 'inputData', { data: v.data, artifact: v.artifact }, v.artifact)
        })
    }

    ngAfterViewInit(): void {
        this.detectChanges()
        if (this.enableMapHost && this.mapArtifactContainer) {
            this.mapArtifactManager.setComponentContainer(this.mapArtifactContainer)
        }
    }

    ngOnDestroy(): void {
        this.destroyed = true
        this.beginArtifactRender()
        if (this.enableMapHost && this.mapArtifactContainer) {
            this.mapArtifactManager.clearComponentContainer(this.mapArtifactContainer)
        }
    }

    private detectChanges(): void {
        this.changeDetector.detectChanges()
    }

    private beginArtifactRender(): number {
        this.artifactRenderVersion += 1
        return this.artifactRenderVersion
    }

    private isCurrentArtifactRender(version: number): boolean {
        return !this.destroyed && version === this.artifactRenderVersion
    }

    private clearContainer(): void {
        if (this.container) {
            this.container.clear()
        }
        this.description = null
        this.showAccordion = false
    }
}
