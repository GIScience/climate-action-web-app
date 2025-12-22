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
import { ChartComponent } from './chart/chart.component'
import { ImageComponent } from './image/image.component'
import { MarkdownComponent } from './markdown/markdown.component'
import { PlotlyChartComponent } from './plotly-chart/plotly-chart.component'
import { TableComponent } from './table/table.component'

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
        service.markdown.subscribe(v => {
            if (!v) this.clearContainer()
            else this.display(MarkdownComponent, 'url', v.url, v)
        })
        service.image.subscribe(v => {
            if (!v) this.clearContainer()
            else this.display(ImageComponent, 'url', v.url, v)
        })
        service.table.subscribe(v => {
            if (!v) this.clearContainer()
            else this.display(TableComponent, 'url', v.url, v)
        })
        service.geojson.subscribe(v => {
            if (!v) this.clearContainer()
        })
        service.geotiff.subscribe(v => {
            if (!v) this.clearContainer()
        })
        service.chart.subscribe(v => {
            if (!v.data) this.clearContainer()
            else this.display(ChartComponent, 'inputData', { data: v.data, artifact: v }, v.artifact)
        })
        service.plotlyChart.subscribe(v => {
            if (!v.data) this.clearContainer()
            else this.display(PlotlyChartComponent, 'inputData', { data: v.data, artifact: v.artifact }, v.artifact)
        })
    }

    ngAfterViewInit(): void {
        this.detectChanges()
        if (this.enableMapHost && this.mapArtifactContainer) {
            this.mapArtifactManager.setComponentContainer(this.mapArtifactContainer)
        }
    }

    ngOnDestroy(): void {
        if (this.enableMapHost && this.mapArtifactContainer) {
            this.mapArtifactManager.clearComponentContainer(this.mapArtifactContainer)
        }
    }

    private detectChanges(): void {
        this.changeDetector.detectChanges()
    }

    private clearContainer(): void {
        if (this.container) {
            this.container.clear()
        }
        this.description = null
        this.showAccordion = false
    }
}
