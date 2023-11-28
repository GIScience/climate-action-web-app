import {Component, Input, OnInit} from '@angular/core'
import {ChartConfiguration, ChartType} from 'chart.js'

import {Artifact, ChartResponse} from "../../artifact/artifact.interface"

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit {

    @Input() inputData: { data: ChartResponse | null, artifact: Artifact | null } | undefined

    public baseChartLegend = true
    public baseChartPlugins = []
    public baseChartData: ChartConfiguration['data'] | undefined
    public baseChartOptions: ChartConfiguration['options']
    public baseChartType!: ChartType

    ngOnInit(): void {
        if (!this.inputData)
            return

        if (!this.inputData.data)
            return

        if (this.inputData.data.chart_type === 'PIE') {
            this.inputData.data.y = this.inputData.data.y.map(y => y * 100)
        }

        this.baseChartType = (this.inputData.data.chart_type.toLowerCase()) as ChartType

        this.baseChartData = {
            labels: this.inputData.data.x,
            datasets: [
                {
                    data: this.inputData.data.y,
                    label: this.inputData.artifact?.name,
                    backgroundColor: this.inputData.data.color,
                }
            ],
        }

        this.baseChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {},
                y: {},
            },
        }
    }
}
