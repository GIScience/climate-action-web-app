import {Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core'
import {ChartConfiguration, ChartType, ChartTypeRegistry, TooltipItem} from 'chart.js'
import {convertToTitleCase} from '../../utils/report-utils'

import {Artifact, ChartData} from '../../artifact/artifact.interface'

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit {

    @ViewChild('chartCanvas') chartCanvas?: ElementRef
    @Input() inputData: { data: ChartData | null, artifact: Artifact | null } | undefined

    public baseChartLegend = true
    public baseChartPlugins = []
    public baseChartData: ChartConfiguration['data'] | undefined
    public baseChartOptions: ChartConfiguration['options']
    public baseChartType!: ChartType

    pieTooltipLabelFunc(context: TooltipItem<'pie'>) {
        let label = context.label || ''
        if (label) {
            const sum = context.dataset.data.reduce((sumSoFar, currVal) => sumSoFar + currVal, 0)
            const percent = (context.parsed / sum) * 100
            label += ': ' + context.formattedValue + ' (' + percent.toFixed(2) + '%)'
        }
        return label
    }

    generalTooltipLabelFunc(context: TooltipItem<keyof ChartTypeRegistry>) {
        let label = context.label || ''
        if (label) {
            label += ': ' + context.formattedValue
        }
        return label
    }

    convertToTitleCase(str: string | number): string {
        return convertToTitleCase(str)
    }

    ngOnInit(): void {
        if (!this.inputData || !this.inputData.data)
            return

        this.baseChartType = (this.inputData.data.chart_type.toLowerCase()) as ChartType

        this.baseChartData = {
            labels: this.inputData.data.x.map(label => this.convertToTitleCase(label)),
            datasets: [
                {
                    data: this.inputData.data.y,
                    label: this.inputData.artifact?.name,
                    backgroundColor: this.inputData.data.color
                }
            ]
        }

        this.baseChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {display: !(this.inputData.data.chart_type === 'PIE')},
                y: {display: !(this.inputData.data.chart_type === 'PIE')}
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: () => '',
                        label: (this.inputData.data.chart_type === 'PIE') ? this.pieTooltipLabelFunc : this.generalTooltipLabelFunc
                    }
                }
            }
        }
    }
}
