import {Component, Input, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {HttpClient} from '@angular/common/http'
import {Papa} from 'ngx-papaparse'

@Component({
    selector: 'app-table',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {
    @Input() url: string | undefined
    csvData: object[] = []

    constructor(private http: HttpClient,
                private papa: Papa) {
    }

    ngOnInit(): void {
        if (!this.url)
            return

        this.http.get(this.url, {responseType: 'text'})
            .subscribe((data) => {
                this.parseCSVData(data)
            })
    }

    private parseCSVData(csvData: string): void {
        this.papa.parse(csvData, {
            header: false,
            skipEmptyLines: true,
            complete: (result) => {
                this.csvData = result.data
            }
        })
    }
}
