import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core'
import { RouterModule } from '@angular/router'
import { Subscription } from 'rxjs'
import { ArtifactComponent } from './artifact/artifact.component'
import { LegendObject } from './artifact/artifact.interface'
import { ArtifactService } from './artifact/artifact.service'
import { LegendComponent } from './artifact/legend/legend.component'
import { ComputationsIndexComponent } from './computations-index/computations-index.component'
import { MapComponent } from './map/map.component'
import { PluginCatalogComponent } from './plugin-catalog/plugin-catalog.component'
import { SearchComponent } from './search/search.component'

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [PluginCatalogComponent, ArtifactComponent, SearchComponent, MapComponent, RouterModule],
    standalone: true
})
export class DashboardComponent implements OnInit {
    @ViewChild(ComputationsIndexComponent) computationsIndexComponent?: ComputationsIndexComponent
    @ViewChild('legendContainer', { read: ViewContainerRef, static: false })
    legendContainer!: ViewContainerRef
    legendSubscription!: Subscription

    constructor(public artifactService: ArtifactService) {}

    ngOnInit(): void {
        this.legendSubscription = this.artifactService.legend.subscribe(legend => {
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
