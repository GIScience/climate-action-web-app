import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Input, OnInit, inject } from '@angular/core'
import { Papa } from 'ngx-papaparse'

@Component({
    selector: 'app-table',
    imports: [CommonModule],
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {
    private http = inject(HttpClient)
    private papa = inject(Papa)

    @Input() url: string | undefined
    csvData: object[] = []

    ngOnInit(): void {
        if (!this.url) return

        this.http.get(this.url, { responseType: 'text' }).subscribe(data => {
            this.parseCSVData(data)
        })
    }

    private parseCSVData(csvData: string): void {
        this.papa.parse(csvData, {
            header: false,
            skipEmptyLines: true,
            complete: result => {
                this.csvData = result.data
            }
        })
    }
}
