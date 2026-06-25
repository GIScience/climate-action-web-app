import { CommonModule } from '@angular/common'
import {
    Component,
    ElementRef,
    HostListener,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewContainerRef,
    inject
} from '@angular/core'
import { RouterModule } from '@angular/router'
import { LucideAngularModule, PanelLeftClose, PanelLeftOpen } from 'lucide-angular'
import { Subscription } from 'rxjs'
import { ArtifactViewerComponent } from './artifact-viewer/artifact-viewer.component'
import { ArtifactViewerService } from './artifact-viewer/artifact-viewer.service'
import { LegendObject } from './artifact/artifact.interface'
import { MapArtifactLayer, MapArtifactManagerService } from './map/map-artifact-manager.service'
import { MapComponent } from './map/map.component'
import { MapService } from './map/map.service'
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
        LucideAngularModule
    ]
})
export class DashboardComponent implements OnInit, OnDestroy {
    artifactViewerService = inject(ArtifactViewerService)
    reportService = inject(ReportService)
    mapService = inject(MapService)
    private mapArtifactManager = inject(MapArtifactManagerService)
    private elementRef = inject(ElementRef)

    @ViewChild('legendContainer', { read: ViewContainerRef, static: false })
    legendContainer!: ViewContainerRef
    mapArtifactsSubscription!: Subscription
    leftColumnCollapsed = false
    isReportVisible = false
    private collapseTimeout?: number
    private legendRenderVersion = 0
    private renderedLegendKey = ''

    readonly PanelLeftClose = PanelLeftClose
    readonly PanelLeftOpen = PanelLeftOpen

    ngOnInit(): void {
        this.mapArtifactsSubscription = this.mapArtifactManager.activeMapArtifacts$.subscribe(activeArtifacts => {
            this.updateLegends(activeArtifacts)
        })

        this.reportService.collapseLeftColumn$.subscribe(collapse => {
            this.leftColumnCollapsed = collapse
        })

        this.reportService.isVisible$.subscribe(isVisible => {
            this.isReportVisible = isVisible
        })
    }

    private async createLegend(
        legendData: LegendObject,
        layer: MapArtifactLayer,
        renderVersion: number
    ): Promise<void> {
        if (!this.legendContainer) return

        const { LegendComponent } = await import('./artifact/legend/legend.component')
        if (!this.isCurrentLegendRender(renderVersion)) return

        const componentRef = this.legendContainer.createComponent(LegendComponent)
        componentRef.instance.artifactId = layer.artifact.correlation_uuid

        if (legendData.legend_type === 'DISCRETE' && layer.artifact.modality === 'VECTOR_MAP_LAYER') {
            const persistedHiddenCategories = this.mapArtifactManager.getHiddenCategories(layer.artifact)
            if (persistedHiddenCategories?.length) {
                persistedHiddenCategories.forEach(category =>
                    componentRef.instance.categoryVisibility.set(category, false)
                )
            }

            componentRef.instance.onHiddenCategoriesChange = (hiddenCategories: string[] | null) => {
                this.mapArtifactManager.setHiddenCategories(layer.artifact, hiddenCategories)
            }

            if (persistedHiddenCategories?.length) {
                const currentLayer = this.mapArtifactManager.getLayerInfo(layer.artifact)
                if (currentLayer?.layerIds?.length) {
                    this.mapService.filterVectorLayerByCategories(currentLayer.layerIds, persistedHiddenCategories)
                }
            }
        }

        componentRef.instance.legendData = legendData
    }

    private removeLegendContainer(): void {
        if (this.legendContainer) {
            this.legendContainer.clear()
        }
    }

    private updateLegends(activeArtifacts: MapArtifactLayer[]): void {
        const legendLayers = activeArtifacts.filter(l => l.artifact.attachments?.legend)
        const key = legendLayers.map(l => `${l.artifact.correlation_uuid}|${l.artifact.filename}`).join('||')

        if (key === this.renderedLegendKey) return
        this.renderedLegendKey = key

        const renderVersion = this.beginLegendRender()
        this.removeLegendContainer()
        legendLayers.forEach(layer => {
            const legend = layer.artifact.attachments?.legend
            if (!legend) return

            const legendData = { ...legend }
            legendData.title = legendData.title || layer.artifact.name
            void this.createLegend(legendData, layer, renderVersion)
        })
    }

    private beginLegendRender(): number {
        this.legendRenderVersion += 1
        return this.legendRenderVersion
    }

    private isCurrentLegendRender(version: number): boolean {
        return version === this.legendRenderVersion
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

    ngOnDestroy(): void {
        if (this.mapArtifactsSubscription) {
            this.mapArtifactsSubscription.unsubscribe()
        }
        this.renderedLegendKey = ''
        this.beginLegendRender()
        this.removeLegendContainer()
    }
}
