import { CommonModule } from '@angular/common'
import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    Input,
    OnInit,
    Type,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation
} from '@angular/core'
import { MatExpansionModule } from '@angular/material/expansion'
import { DomSanitizer } from '@angular/platform-browser'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { Artifact } from './artifact.interface'
import { ArtifactService } from './artifact.service'
import { ChartComponent } from './chart/chart.component'
import { GeojsonComponent } from './geojson/geojson.component'
import { GeoTiffComponent } from './geotiff/geotiff.component'
import { ImageComponent } from './image/image.component'
import { MarkdownComponent } from './markdown/markdown.component'
import { PlotlyChartComponent } from './plotly-chart/plotly-chart.component'
import { TableComponent } from './table/table.component'

@Component({
    selector: 'app-artifact',
    templateUrl: './artifact.component.html',
    styleUrls: ['./artifact.component.scss'],
    imports: [CommonModule, MatExpansionModule, NgScrollbarModule, MarkdownComponent],
    standalone: true,
    encapsulation: ViewEncapsulation.None
})
export class ArtifactComponent implements OnInit, AfterViewInit {
    @ViewChild('container', { read: ViewContainerRef })
    container!: ViewContainerRef
    @ViewChild('descriptionContainer', { read: ViewContainerRef })
    descriptionContainer!: ViewContainerRef

    @Input() artifact?: Artifact
    @Input() artifactService?: ArtifactService

    summary: string | null = null
    description: string | null = null
    showAccordion = false
    modality: string | null = null

    constructor(
        private defaultArtifactService: ArtifactService,
        private sanitizer: DomSanitizer,
        private changeDetector: ChangeDetectorRef
    ) {}

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
            else this.display(GeojsonComponent, 'inputData', { url: v.url, artifact: v }, v)
        })
        service.geotiff.subscribe(v => {
            if (!v) this.clearContainer()
            else this.display(GeoTiffComponent, 'inputData', { url: v.url, artifact: v }, v)
        })
        service.chart.subscribe(v => {
            if (!v.data) this.clearContainer()
            else this.display(ChartComponent, 'inputData', { data: v.data, artifact: v }, v.artifact)
        })
        service.plotlyChart.subscribe(v => {
            if (!v.data) this.clearContainer()
            else this.display(PlotlyChartComponent, 'inputData', { data: v.data, artifact: v }, v.artifact)
        })
    }

    ngAfterViewInit(): void {
        this.detectChanges()
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
