import {Component, OnInit, ViewChild, ViewContainerRef} from '@angular/core'
import {PluginCatalogComponent} from './plugin-catalog/plugin-catalog.component'
import {ArtifactComponent} from './artifact/artifact.component'
import {ReportComponent} from './report/report.component'
import {MapComponent} from './map/map.component'
import {RouterModule} from '@angular/router'
import {LegendComponent} from './report/legend/legend.component'
import {LegendObject} from './artifact/artifact.interface'
import {ReportService} from './report/report.service'
import {Subscription} from 'rxjs'

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [
        PluginCatalogComponent,
        ArtifactComponent,
        ReportComponent,
        MapComponent,
        RouterModule,
        LegendComponent
    ],
    standalone: true
})
export class DashboardComponent implements OnInit {
    @ViewChild(ArtifactComponent) artifactComponent?: ArtifactComponent
    @ViewChild('legendContainer', {read: ViewContainerRef, static: false})

    legendContainer!: ViewContainerRef
    private legendSubscription!: Subscription

    constructor(public reportService: ReportService) {}

    ngOnInit(): void {
        this.legendSubscription = this.reportService.legend.subscribe(legend => {
            if (legend) {
                this.displayLegend(legend)
            } else {
                this.removeLegendContainer()
            }
        })
    }

    private displayLegend(legendData: LegendObject): void {
        if (this.legendContainer) {
            const componentRef = this.legendContainer.createComponent(LegendComponent)
            componentRef.instance.legendData = legendData
        }
    }

    private removeLegendContainer(): void {
        if (this.legendContainer) {
            this.legendContainer.clear()
        }
    }
}
