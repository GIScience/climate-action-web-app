import {Component, OnInit, Type, ViewChild, ViewContainerRef} from '@angular/core'
import {ReportService} from './report.service'
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
        MatGridListModule
    ],
    standalone: true
})
export class ReportComponent implements OnInit {

    @ViewChild('container', {read: ViewContainerRef})
    container!: ViewContainerRef

    constructor(private reportService: ReportService) {
    }

    display<C>(componentType: Type<C>, name: string, value: unknown) {
        this.container.clear()
        const ref = this.container.createComponent(componentType)
        ref.setInput(name, value)
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
