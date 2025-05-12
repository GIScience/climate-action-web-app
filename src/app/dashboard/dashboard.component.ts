import { CommonModule } from '@angular/common'
import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core'
import { RouterModule } from '@angular/router'
import { TippyDirective } from '@ngneat/helipopper'
import { LucideAngularModule, PanelLeftClose, PanelLeftOpen } from 'lucide-angular'
import { Subscription } from 'rxjs'
import { ArtifactViewerComponent } from './artifact-viewer/artifact-viewer.component'
import { ArtifactViewerService } from './artifact-viewer/artifact-viewer.service'
import { LegendObject } from './artifact/artifact.interface'
import { ArtifactService } from './artifact/artifact.service'
import { LegendComponent } from './artifact/legend/legend.component'
import { ComputationsIndexComponent } from './computations-index/computations-index.component'
import { MapComponent } from './map/map.component'
import { PluginCatalogComponent } from './plugin-catalog/plugin-catalog.component'
import { ReportComponent } from './report/report.component'
import { ReportService } from './report/report.service'
import { SearchComponent } from './search/search.component'

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [
        CommonModule,
        PluginCatalogComponent,
        ArtifactViewerComponent,
        SearchComponent,
        MapComponent,
        RouterModule,
        ReportComponent,
        LucideAngularModule,
        TippyDirective
    ],
    standalone: true
})
export class DashboardComponent implements OnInit {
    @ViewChild(ComputationsIndexComponent) computationsIndexComponent?: ComputationsIndexComponent
    @ViewChild('legendContainer', { read: ViewContainerRef, static: false })
    legendContainer!: ViewContainerRef
    legendSubscription!: Subscription

    leftColumnCollapsed = false

    readonly PanelLeftClose = PanelLeftClose
    readonly PanelLeftOpen = PanelLeftOpen
    constructor(
        public artifactService: ArtifactService,
        public artifactViewerService: ArtifactViewerService,
        public reportService: ReportService
    ) {}

    ngOnInit(): void {
        this.legendSubscription = this.artifactService.legend.subscribe(legend => {
            if (legend) {
                this.displayLegend(legend)
            } else {
                this.removeLegendContainer()
            }
        })

        this.reportService.collapseLeftColumn$.subscribe(collapse => {
            this.leftColumnCollapsed = collapse
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

    collapseLeftColumn(): void {
        this.leftColumnCollapsed = !this.leftColumnCollapsed
        this.reportService.collapseLeftColumn(this.leftColumnCollapsed)
    }
}
