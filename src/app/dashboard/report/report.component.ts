import {Component, OnInit, AfterViewInit, Type, ViewChild, ViewContainerRef, ChangeDetectorRef, ViewEncapsulation} from '@angular/core'
import {CommonModule} from '@angular/common'
import {ReportService} from './report.service'
import {DomSanitizer, SafeUrl} from '@angular/platform-browser'
import {MarkdownComponent} from './markdown/markdown.component'
import {ImageComponent} from './image/image.component'
import {TableComponent} from './table/table.component'
import {GeojsonComponent} from './geojson/geojson.component'
import {GeoTiffComponent} from './geotiff/geotiff.component'
import {ChartComponent} from './chart/chart.component'
import {MatGridListModule} from '@angular/material/grid-list'
import {Artifact} from '../artifact/artifact.interface'
import {MatExpansionModule} from '@angular/material/expansion'
import {TippyDirective} from '@ngneat/helipopper'
import {NgScrollbarModule} from 'ngx-scrollbar'
import {CdkDrag, CdkDragHandle} from '@angular/cdk/drag-drop'
import {LucideAngularModule, GripHorizontal, Maximize2, Minimize2, X, Download} from 'lucide-angular'

@Component({
    selector: 'app-report',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.scss'],
    imports: [
        MatGridListModule,
        CommonModule,
        MatExpansionModule,
        TippyDirective,
        NgScrollbarModule,
        MarkdownComponent,
        CdkDrag,
        CdkDragHandle,
        LucideAngularModule
    ],
    standalone: true,
    encapsulation: ViewEncapsulation.None
})
export class ReportComponent implements OnInit, AfterViewInit {

    @ViewChild('container', {read: ViewContainerRef})
    container!: ViewContainerRef
    @ViewChild('descriptionContainer', {read: ViewContainerRef})
    descriptionContainer!: ViewContainerRef

    currentUrl: string | null = null
    downloadJsonHref: SafeUrl | null = null
    name: string | null = null
    summary: string | null = null
    description: string | null = null
    showAccordion = false
    minimised = false
    modality: string | null = null

    readonly GripHorizontal = GripHorizontal
    readonly Download = Download
    readonly Maximize2 = Maximize2
    readonly Minimize2 = Minimize2
    readonly X = X

    constructor(
        public reportService: ReportService,
        private sanitizer: DomSanitizer,
        private changeDetector: ChangeDetectorRef
    ) {}

    display<C>(componentType: Type<C>, name: string, value: unknown, artifact: Artifact | null, clearContainer = true) {
        if (clearContainer && this.container)
            this.container.clear()

        const ref = this.container.createComponent(componentType)
        ref.setInput(name, value)

        this.displayName(artifact?.name || null)
        this.displaySummary(artifact?.summary || null)
        this.displayDescription(artifact?.description || null)
        this.modality = artifact?.modality || null

        if (typeof value === 'object' && value && !(value as {url?: string}).url) {
            this.generateDownloadJsonUri(value)
            this.currentUrl = null
        } else {
            this.currentUrl = typeof value === 'string' ? value : (value as {url?: string})?.url || null
            this.downloadJsonHref = null
        }
        this.refreshAccordion()

        if (this.modality === 'MAP_LAYER_GEOJSON' || this.modality === 'MAP_LAYER_GEOTIFF') {
            this.minimised = true
        } else {
            this.minimised = false
        }
    }

    generateDownloadJsonUri(jsonData: object) {
        const theJSON = JSON.stringify(jsonData)
        this.downloadJsonHref = this.sanitizer.bypassSecurityTrustUrl(
            'data:application/json;charset=UTF-8,' + encodeURIComponent(theJSON)
        )
    }

    downloadContent(): void {
        if (this.downloadJsonHref) {
            const a = document.createElement('a')
            document.body.appendChild(a)
            a.style.display = 'none'
            a.href = (this.downloadJsonHref as {changingThisBreaksApplicationSecurity: string}).changingThisBreaksApplicationSecurity
            a.download = 'data.json'
            a.click()
            document.body.removeChild(a)
        } else if (this.currentUrl) {
            const a = document.createElement('a')
            a.href = this.currentUrl
            a.download = this.getFileName(this.currentUrl)
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        }
    }

    getFileName(url: string): string {
        return url.split('/').pop() || 'download'
    }
    
    private displayName(name: string | null) {
        this.name = name
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

    toggleMinimise(): void {
        this.minimised = !this.minimised
    }

    ngOnInit(): void {
        this.reportService.markdown.subscribe(v => {
            if (!v) this.clearContainer()
            else this.display(MarkdownComponent, 'url', v.url, v.artifact)
        })
        this.reportService.image.subscribe(v => {
            if (!v) this.clearContainer()
            else this.display(ImageComponent, 'url', v.url, v.artifact)
        })
        this.reportService.table.subscribe(v => {
            if (!v) this.clearContainer()
            else this.display(TableComponent, 'url', v.url, v.artifact)
        })
        this.reportService.geojson.subscribe(v => {
            if (!v) this.clearContainer()
            else this.display(GeojsonComponent, 'inputData', v, v.artifact)
        })
        this.reportService.geotiff.subscribe(v => {
            if (!v) this.clearContainer()
            else this.display(GeoTiffComponent, 'inputData', v, v.artifact)
        })
        this.reportService.chart.subscribe(v => {
            if (!v.data) this.clearContainer()
            else this.display(ChartComponent, 'inputData', { data: v.data, artifact: v.artifact }, v.artifact)
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
