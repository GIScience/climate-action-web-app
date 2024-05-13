import {Component, OnInit, Type, ViewChild, ViewContainerRef} from '@angular/core'
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

@Component({
    selector: 'app-report',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.scss'],
    imports: [
        MatGridListModule,
        CommonModule
    ],
    standalone: true
})
export class ReportComponent implements OnInit {

    @ViewChild('container', {read: ViewContainerRef})
    container!: ViewContainerRef
    currentUrl: string | null = null
    downloadJsonHref: SafeUrl | null = null

    constructor(
        private reportService: ReportService,
        private sanitizer: DomSanitizer
    ) {}

    display<C>(componentType: Type<C>, name: string, value: unknown) {
        if(this.container)
            this.container.clear()

        const ref = this.container.createComponent(componentType)
        ref.setInput(name, value)

        if (typeof value === 'object' && value && !(value as any).url) {
            this.generateDownloadJsonUri(value)
            this.currentUrl = null
        } else {
            this.currentUrl = typeof value === 'string' ? value : (value as any)?.url || null
            this.downloadJsonHref = null
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
            a.href = (this.downloadJsonHref as any).changingThisBreaksApplicationSecurity
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

    ngOnInit(): void {
        this.reportService.markdown.subscribe(v => {
            if (v === '') return
            this.display(MarkdownComponent, 'url', v)
        })
        this.reportService.image.subscribe(v => {
            if (v === '') return
            this.display(ImageComponent, 'url', v)
        })
        this.reportService.table.subscribe(v => {
            if (v === '') return
            this.display(TableComponent, 'url', v)
        })
        this.reportService.geojson.subscribe(v => {
            if (v.url === '') return
            this.display(GeojsonComponent, 'inputData', v)
        })
        this.reportService.geotiff.subscribe(v => {
            if (v.url === '') return
            this.display(GeoTiffComponent, 'inputData', v)
        })
        this.reportService.chart.subscribe(v => {
            if (!v.data) return
            this.display(ChartComponent, 'inputData', v)
        })
    }
}
