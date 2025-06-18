import { animate, style, transition, trigger } from '@angular/animations'
import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, ComponentRef, OnInit, QueryList, ViewChildren, ViewContainerRef } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { TippyDirective } from '@ngneat/helipopper'
import { ClipboardPlus, Grid2x2, ListX, LucideAngularModule, Minus, Rows3, X } from 'lucide-angular'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { StorageService } from '../../storage.service'
import { ArtifactComponent } from '../artifact/artifact.component'
import { ArtifactEntity, LegendObject } from '../artifact/artifact.interface'
import { LegendComponent } from '../artifact/legend/legend.component'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { ReportService } from './report.service'

@Component({
    selector: 'app-report',
    imports: [CommonModule, ArtifactComponent, MatIconModule, LucideAngularModule, NgScrollbarModule, TippyDirective],
    templateUrl: './report.component.html',
    styleUrls: ['./report.component.scss'],
    animations: [
        trigger('reportAnimation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.98)' }),
                animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
            ])
        ])
    ]
})
export class ReportComponent implements OnInit {
    artifacts: ArtifactEntity[] = []
    isVisible = false
    reportLayout = 'grid'
    maxArtifacts = this.reportService.MAX_ARTIFACTS

    readonly X = X
    readonly Minus = Minus
    readonly Grid2x2 = Grid2x2
    readonly Rows3 = Rows3
    readonly ListX = ListX
    readonly ClipboardPlus = ClipboardPlus

    @ViewChildren('legendContainer', { read: ViewContainerRef })
    legendContainers!: QueryList<ViewContainerRef>

    private mapServices: Map<string, MapService> = new Map()
    private legendComponents: Map<string, ComponentRef<LegendComponent>> = new Map()

    constructor(
        public reportService: ReportService,
        private pluginService: PluginService,
        private http: HttpClient,
        private storageService: StorageService
    ) {}

    ngOnInit(): void {
        this.reportService.artifacts$.subscribe(artifacts => {
            const previousArtifactIds = this.artifacts.map(a => a.store_id)
            const currentArtifactIds = artifacts.map(a => a.store_id)

            const addedArtifacts = artifacts.filter(a => !previousArtifactIds.includes(a.store_id))
            const removedArtifactIds = previousArtifactIds.filter(id => !currentArtifactIds.includes(id))

            this.artifacts = artifacts

            addedArtifacts.forEach(artifact => {
                if (this.reportService.isMapArtifact(artifact) && !this.mapServices.has(artifact.store_id)) {
                    const mapService = new MapService(this.pluginService, this.http, this.storageService)
                    this.mapServices.set(artifact.store_id, mapService)

                    const artifactService = this.reportService.getServiceForArtifact(artifact)
                    if (artifactService) {
                        artifactService.clearLegend()

                        artifactService.legend.subscribe(legend => {
                            if (legend) {
                                this.displayLegend(artifact.store_id, legend)
                            }
                        })

                        artifactService.getLegend(artifact)
                    }
                }
            })

            removedArtifactIds.forEach(id => {
                if (this.mapServices.has(id)) {
                    this.mapServices.delete(id)
                }
                this.removeLegend(id)
            })
        })

        this.reportService.isVisible$.subscribe(isVisible => {
            this.isVisible = isVisible

            if (!isVisible) {
                this.artifacts.forEach(artifact => {
                    if (this.reportService.isMapArtifact(artifact)) {
                        this.removeLegend(artifact.store_id)
                    }
                })
            }
        })
    }

    private displayLegend(artifactId: string, legendData: LegendObject): void {
        this.removeLegend(artifactId)

        setTimeout(() => {
            const container = this.legendContainers.find(
                container => container.element.nativeElement.id === `report-map-legend-${artifactId}`
            )
            if (container) {
                const componentRef = container.createComponent(LegendComponent)
                componentRef.instance.legendData = legendData
                componentRef.instance.artifactId = artifactId
                this.legendComponents.set(artifactId, componentRef)
            }
        })
    }

    private removeLegend(artifactId: string): void {
        const component = this.legendComponents.get(artifactId)
        if (component) {
            component.destroy()
            this.legendComponents.delete(artifactId)
        }
    }

    removeReportItem(artifact: ArtifactEntity) {
        if (this.reportService.isMapArtifact(artifact)) {
            this.mapServices.delete(artifact.store_id)
            this.removeLegend(artifact.store_id)
        }
        this.reportService.removeArtifact(artifact)
    }

    removeAllReportItems() {
        this.artifacts.forEach(artifact => {
            if (this.reportService.isMapArtifact(artifact)) {
                this.mapServices.delete(artifact.store_id)
            }
            this.reportService.removeArtifact(artifact)
        })
    }

    getMapService(artifact: ArtifactEntity): MapService | undefined {
        return this.mapServices.get(artifact.store_id)
    }

    setReportLayout(layout: 'rows' | 'grid') {
        this.reportLayout = layout
    }
}
