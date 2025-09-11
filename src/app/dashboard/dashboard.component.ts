import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, ElementRef, HostListener, OnInit, ViewChild, ViewContainerRef } from '@angular/core'
import { RouterModule } from '@angular/router'
import { LucideAngularModule, PanelLeftClose, PanelLeftOpen } from 'lucide-angular'
import { ToastrService } from 'ngx-toastr'
import { Subscription } from 'rxjs'
import { ArtifactViewerComponent } from './artifact-viewer/artifact-viewer.component'
import { ArtifactViewerService } from './artifact-viewer/artifact-viewer.service'
import { LegendObject } from './artifact/artifact.interface'
import { ArtifactService } from './artifact/artifact.service'
import { LegendComponent } from './artifact/legend/legend.component'
import { ComputationsIndexComponent } from './computations-index/computations-index.component'
import { MapComponent } from './map/map.component'
import { MapService } from './map/map.service'
import { PluginCatalogComponent } from './plugin-catalog/plugin-catalog.component'
import { ReportComponent } from './report/report.component'
import { ReportService } from './report/report.service'
import { SearchComponent } from './search/search.component'

interface MaintenanceAnnouncement {
    maintenanceType: string
    servicesAffected: string
    impact: string
    level: 'info' | 'warning'
    downtimeEnd: string
    messageDisplayStart: string
}

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
        LucideAngularModule
    ]
})
export class DashboardComponent implements OnInit {
    @ViewChild(ComputationsIndexComponent) computationsIndexComponent?: ComputationsIndexComponent
    @ViewChild('legendContainer', { read: ViewContainerRef, static: false })
    legendContainer!: ViewContainerRef
    legendSubscription!: Subscription

    leftColumnCollapsed = false
    isReportVisible = false
    private collapseTimeout?: number

    readonly PanelLeftClose = PanelLeftClose
    readonly PanelLeftOpen = PanelLeftOpen

    constructor(
        public artifactService: ArtifactService,
        public artifactViewerService: ArtifactViewerService,
        public reportService: ReportService,
        public mapService: MapService,
        private elementRef: ElementRef,
        private toastr: ToastrService,
        private http: HttpClient
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

        this.reportService.isVisible$.subscribe(isVisible => {
            this.isReportVisible = isVisible
        })

        this.fetchMaintenanceAnn()
    }

    private fetchMaintenanceAnn(): void {
        this.http.get<MaintenanceAnnouncement[]>('maintenance-log.json').subscribe({
            next: (announcements: MaintenanceAnnouncement[]) => {
                this.processMaintenanceAnn(announcements)
            },
            error: err => {
                console.error('Failed to load maintenance announcements:', err)
            }
        })
    }

    private processMaintenanceAnn(announcements: MaintenanceAnnouncement[]): void {
        const now = new Date()
        announcements.forEach((ann: MaintenanceAnnouncement) => {
            const messageDisplayStart = new Date(ann.messageDisplayStart)
            const downtimeEnd = new Date(ann.downtimeEnd)
            if (messageDisplayStart <= now && downtimeEnd > now) {
                this.toastr[ann.level](ann.servicesAffected + ' ' + ann.impact, ann.maintenanceType || '', {
                    toastClass: 'ngx-toastr ngx-toastr--inverted',
                    positionClass: 'toast-top-center',
                    disableTimeOut: true,
                    closeButton: true
                })
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

    collapseLeftColumn(): void {
        this.leftColumnCollapsed = !this.leftColumnCollapsed
        this.reportService.collapseLeftColumn(this.leftColumnCollapsed)
    }

    onMouseEnterLeftColumn(): void {
        if (this.collapseTimeout) clearTimeout(this.collapseTimeout)
        if (this.isReportVisible && this.leftColumnCollapsed) {
            this.leftColumnCollapsed = false
            this.reportService.collapseLeftColumn(false)
        }
    }

    onMouseLeaveLeftColumn(): void {
        if (this.isReportVisible && !this.leftColumnCollapsed) {
            this.collapseTimeout = window.setTimeout(() => this.setCollapsed(true), 800)
        }
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.isReportVisible && !this.leftColumnCollapsed) {
            const leftColumn = this.elementRef.nativeElement.querySelector('.dashboard__left-column')
            if (leftColumn && !leftColumn.contains(event.target)) {
                if (this.collapseTimeout) clearTimeout(this.collapseTimeout)
                this.setCollapsed(true)
            }
        }
    }

    private setCollapsed(collapsed: boolean): void {
        this.leftColumnCollapsed = collapsed
        this.reportService.collapseLeftColumn(collapsed)
    }
}
