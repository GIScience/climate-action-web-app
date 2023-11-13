import {Component, OnInit, ViewChild, ViewContainerRef} from '@angular/core';
import {ReportService} from "../services/report.service";
import {MarkdownComponent} from "./markdown/markdown.component";
import {ImageComponent} from "./image/image.component";
import {TableComponent} from "./table/table.component";
import {GeojsonComponent} from "./geojson/geojson.component";
import {GeoTiffComponent} from "./geotiff/geotiff.component";
import {ChartComponent} from "./chart/chart.component";

@Component({
    selector: 'app-report',
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.scss']
})
export class ReportComponent implements OnInit {

    @ViewChild('container', { read: ViewContainerRef })
    container!: ViewContainerRef;

    constructor(private reportService: ReportService) {}

    ngOnInit(): void {
        // Markdown text
        this.reportService.markdownOb.subscribe(markdownUrl => {
            if (markdownUrl === '')
                return

            // console.log('>>> ReportComponent >>> markdownOb ', markdownUrl)
            const markdownRef = this.container.createComponent(MarkdownComponent);
            markdownRef.setInput('url', markdownUrl);
        })

        // Image
        this.reportService.imageOb.subscribe(imageUrl => {
            if(imageUrl === '')
              return

            const imageRef = this.container.createComponent(ImageComponent);
            imageRef.setInput('url', imageUrl);
        })

        // Table which is CSV format
        this.reportService.tableOb.subscribe(url => {
            if(url === '')
                return

            const tableRef = this.container.createComponent(TableComponent);
            tableRef.setInput('url', url);
        })

        // GeoJSON
        this.reportService.geojsonOb.subscribe(res => {
            if(res.url === '')
                return

            const geojsonRef = this.container.createComponent(GeojsonComponent);
            geojsonRef.setInput('inputData', res);
        })

        // GeoTiff
        this.reportService.geotiffOb.subscribe(res => {
            if(res.url === '')
                return

            const geotiffRef = this.container.createComponent(GeoTiffComponent);
            geotiffRef.setInput('inputData', res);
        })

        // Charts
        this.reportService.chartOb.subscribe(res => {
            if(! res.data)
                return

            const chartRef = this.container.createComponent(ChartComponent);
            chartRef.setInput('inputData', res);
        })
    }

}
