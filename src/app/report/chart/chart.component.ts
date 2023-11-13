import {Component, Input, OnInit} from '@angular/core';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';

import {ArtifactType, ChartResponse} from "../../models/artifact.interface";

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit {

    @Input() inputData: { data: ChartResponse | null, artifact: ArtifactType | null } | undefined;

    public baseChartLegend = true;
    public baseChartPlugins = [];
    public baseChartData: ChartConfiguration<any>['data'] | undefined;
    public baseChartOptions: ChartConfiguration['options']
    public baseChartType!: ChartType;

    ngOnInit(): void {
        console.log('>>> ChartComponent >>> ngOnInit ', this.inputData)

        if (!this.inputData)
            return

        if (!this.inputData.data)
            return

        // type specific attributes
        if(this.inputData.data.chart_type === 'PIE') {
            this.inputData.data.y = this.inputData.data.y.map( yVal => yVal * 100) // since API gives us percentage values from 0 to 1
        }

        // assign common data and other attributes of charts
        this.baseChartType = (this.inputData.data.chart_type.toLowerCase()) as ChartType
        this.baseChartData = {
            labels: this.inputData.data.x,
            datasets: [
                {
                    data: this.inputData.data.y,
                    label: this.inputData.artifact?.name,
                    backgroundColor: this.inputData.data.color,
                },
            ],
        }
        this.baseChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            // We use these empty structures as placeholders for dynamic theming.
            scales: {
                x: {},
                y: {},
            },
        }

    }
}
