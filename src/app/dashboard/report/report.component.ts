import { animate, style, transition, trigger } from '@angular/animations'
import {
    Component,
    ComponentRef,
    ElementRef,
    EnvironmentInjector,
    OnInit,
    QueryList,
    ViewChildren,
    ViewContainerRef,
    inject,
    runInInjectionContext
} from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import { TippyDirective } from '@ngneat/helipopper'
import { ClipboardPlus, FileDown, ListX, LucideAngularModule, Minus, Printer, X } from 'lucide-angular'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ArtifactComponent } from '../artifact/artifact.component'
import { ArtifactEntity, LegendObject } from '../artifact/artifact.interface'
import { LegendComponent } from '../artifact/legend/legend.component'
import { ComputationBasicInfo } from '../computations-index/computation.interface'
import { MapService } from '../map/map.service'
import { ExportPDFService } from './export-pdf.service'
import { ReportService } from './report.service'

@Component({
    selector: 'app-report',
    imports: [
        ArtifactComponent,
        MatIconModule,
        LucideAngularModule,
        NgScrollbarModule,
        TippyDirective,
        TranslocoModule
    ],
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
    reportService = inject(ReportService)
    private injector = inject(EnvironmentInjector)
    private ExportPDFService = inject(ExportPDFService)
    private translocoService = inject(TranslocoService)

    artifacts: ArtifactEntity[] = []
    isVisible = false
    hasExported = false
    maxArtifacts = this.reportService.MAX_ARTIFACTS

    readonly X = X
    readonly Minus = Minus
    readonly ListX = ListX
    readonly ClipboardPlus = ClipboardPlus
    readonly Printer = Printer
    readonly FileDown = FileDown

    @ViewChildren('legendContainer', { read: ViewContainerRef })
    legendContainers!: QueryList<ViewContainerRef>

    @ViewChildren('artifactContainer', { read: ElementRef })
    artifactContainers!: QueryList<ElementRef>

    private mapServices: Map<string, MapService> = new Map()
    private legendComponents: Map<string, ComponentRef<LegendComponent>> = new Map()

    ngOnInit(): void {
        this.reportService.artifacts$.subscribe(artifacts => {
            const previousArtifactIds = this.artifacts.map(a => a.store_id)
            const currentArtifactIds = artifacts.map(a => a.store_id)

            const addedArtifacts = artifacts.filter(a => !previousArtifactIds.includes(a.store_id))
            const removedArtifactIds = previousArtifactIds.filter(id => !currentArtifactIds.includes(id))

            this.artifacts = artifacts

            addedArtifacts.forEach(artifact => {
                if (this.reportService.isMapArtifact(artifact.modality) && !this.mapServices.has(artifact.store_id)) {
                    const mapService = runInInjectionContext(this.injector, () => new MapService())
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
                    if (this.reportService.isMapArtifact(artifact.modality)) {
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
        if (this.reportService.isMapArtifact(artifact.modality)) {
            this.mapServices.delete(artifact.store_id)
            this.removeLegend(artifact.store_id)
        }
        this.reportService.removeArtifact(artifact)
    }

    removeAllReportItems() {
        this.artifacts.forEach(artifact => {
            if (this.reportService.isMapArtifact(artifact.modality)) {
                this.mapServices.delete(artifact.store_id)
            }
            this.reportService.removeArtifact(artifact)
        })
    }

    closeReport() {
        if (!this.hasExported) {
            const confirmMessage = this.translocoService.translate('report.confirmCloseWithoutExport')
            if (confirm(confirmMessage)) {
                this.reportService.closeReport()
            }
            return
        } else {
            this.reportService.closeReport()
        }
    }

    getComputationInfo(artifact: ArtifactEntity): ComputationBasicInfo | undefined {
        return this.reportService.getComputationInfoForArtifact(artifact)
    }

    async exportToPDF() {
        await this.ExportPDFService.exportToPDF(
            this.artifacts,
            this.artifactContainers,
            this.getComputationInfo.bind(this)
        )
        this.hasExported = true
    }
}
