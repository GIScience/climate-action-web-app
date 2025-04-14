import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core'
import Plotly, { Data, Layout, PlotlyInstance } from 'plotly.js-cartesian-dist'
import { Artifact, PlotlyChartData } from '../artifact.interface'

@Component({
    selector: 'app-plotly-chart',
    templateUrl: './plotly-chart.component.html',
    styleUrls: ['./plotly-chart.component.scss']
})
export class PlotlyChartComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('plotlyChart') plotlyChart?: ElementRef
    @Input() inputData: { data: PlotlyChartData | null; artifact: Artifact | null } | undefined

    public plotlyData: Data[] | null = null
    public plotlyLayout: Partial<Layout> | null = null
    private plotlyInstance: PlotlyInstance | null = null

    ngOnInit(): void {
        if (!this.inputData?.data) return

        this.plotlyData = this.inputData.data.data
        this.plotlyLayout = this.inputData.data.layout
        return
    }

    ngAfterViewInit(): void {
        this.initializePlotly()
    }

    private async initializePlotly() {
        if (!this.plotlyChart?.nativeElement || !this.plotlyData || !this.plotlyLayout) return

        try {
            this.plotlyInstance = await Plotly.newPlot(
                this.plotlyChart.nativeElement,
                this.plotlyData,
                this.plotlyLayout,
                {
                    responsive: true,
                    displayModeBar: false
                }
            )
        } catch (error) {
            console.error('Error initializing Plotly chart:', error)
        }
    }

    ngOnDestroy(): void {
        if (this.plotlyInstance) {
            Plotly.purge(this.plotlyChart?.nativeElement)
        }
    }
}
