import { AnimationEvent, animate, state, style, transition, trigger } from '@angular/animations'
import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { derivePluginNameFromId } from '@app/utils/string.utils'
import { TippyDirective } from '@ngneat/helipopper'
import { ClipboardPlus, LucideAngularModule } from 'lucide-angular'
import { ToastrService } from 'ngx-toastr'
import { Observable, Subscription } from 'rxjs'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactData, ArtifactEntity, ChartData, PlotlyChartData } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationBasicInfo, ComputationDisplayEntity } from '../computations-index/computation.interface'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { ReportService } from '../report/report.service'

@Component({
    selector: 'app-computation',
    imports: [CommonModule, LucideAngularModule, MatIconModule, TippyDirective],
    animations: [
        trigger('expandCollapse', [
            state(
                'collapsed',
                style({
                    maxHeight: '0',
                    visibility: 'hidden'
                })
            ),
            state(
                'expanded',
                style({
                    maxHeight: '1000px',
                    visibility: 'visible'
                })
            ),
            transition('expanded <=> collapsed', [animate('250ms ease-in-out')])
        ]),
        trigger('fadeIn', [
            state('in', style({ opacity: 1 })),
            transition(':enter', [style({ opacity: 0 }), animate('250ms ease-in')])
        ])
    ],
    templateUrl: './computation.component.html',
    styleUrls: ['./computation.component.scss']
})
export class ComputationComponent implements OnInit, OnDestroy {
    @Input() computation!: ComputationDisplayEntity
    @Input() activeArtifact?: ArtifactEntity
    @Output() artifactActivated = new EventEmitter<ArtifactEntity>()

    private artifactFetchSubscription: Subscription | undefined
    private reportVisibilitySubscription: Subscription | undefined
    isReportVisible = false

    readonly ClipboardPlus = ClipboardPlus

    constructor(
        private artifactService: ArtifactService,
        private pluginService: PluginService,
        private mapService: MapService,
        private reportService: ReportService,
        private artifactViewerService: ArtifactViewerService,
        private toastr: ToastrService
    ) {}

    ngOnInit(): void {
        this.reportVisibilitySubscription = this.reportService.isVisible$.subscribe(isVisible => {
            this.isReportVisible = isVisible
        })
    }

    ngOnDestroy(): void {
        if (this.artifactFetchSubscription) {
            this.artifactFetchSubscription.unsubscribe()
        }
        if (this.reportVisibilitySubscription) {
            this.reportVisibilitySubscription.unsubscribe()
        }
    }

    onAnimationEvent(event: AnimationEvent, computation: ComputationDisplayEntity) {
        if (event.toState === 'collapsed') {
            computation.keepInDOM = false
        }
    }

    showMore(computation: ComputationDisplayEntity) {
        computation.showSecondaryArtifacts = true
    }

    showLess(computation: ComputationDisplayEntity) {
        computation.showSecondaryArtifacts = false
    }

    hasSecondaryArtifacts(computation: ComputationDisplayEntity): boolean {
        return computation.artifacts.some(artifact => !artifact.primary)
    }

    renderArtifact(artifact: ArtifactEntity) {
        if (this.isReportVisible) {
            this.toastr.warning('Please exit the Report Builder first, or add this artifact to the report.', '', {
                timeOut: 4000
            })
            return
        }

        this.pluginService.collapsePluginCatalog()
        this.artifactViewerService.isViewerVisible = true

        const waitForMapRender = (artifact: ArtifactEntity): Promise<void> => {
            return new Promise<void>(resolve => {
                this.mapService.map?.once('rendercomplete', () => {
                    this.artifactService.getLegend(artifact)
                    artifact.isLoading = false
                    resolve()
                })
            })
        }

        // Allow for any type of report
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const waitForArtifactFetch = (observable: Observable<any>, dataCheck: (data: any) => boolean) => {
            this.artifactFetchSubscription = observable.subscribe({
                next: data => {
                    if (dataCheck(data)) {
                        artifact.isLoading = false
                        if (this.artifactFetchSubscription) {
                            this.artifactFetchSubscription.unsubscribe()
                        }
                    }
                },
                error: err => {
                    console.error('Error fetching artifact:', err)
                    artifact.isLoading = false
                    if (this.artifactFetchSubscription) {
                        this.artifactFetchSubscription.unsubscribe()
                    }
                }
            })
        }

        const artifactTypeMap = {
            IMAGE: { observable: this.artifactService.image, check: (data: ArtifactData | null) => !!data?.url },
            MARKDOWN: { observable: this.artifactService.markdown, check: (data: ArtifactData | null) => !!data?.url },
            TABLE: { observable: this.artifactService.table, check: (data: ArtifactData | null) => !!data?.url },
            CHART: { observable: this.artifactService.chart, check: (data: ChartData | null) => !!data },
            CHART_PLOTLY: {
                observable: this.artifactService.plotlyChart,
                check: (data: PlotlyChartData | null) => !!data
            }
        }

        if (artifact.modality === 'MAP_LAYER_GEOJSON' || artifact.modality === 'MAP_LAYER_GEOTIFF') {
            waitForMapRender(artifact)
            this.artifactViewerService.minimised = true
        } else if (
            artifact.modality === 'CHART' ||
            artifact.modality === 'CHART_PLOTLY' ||
            artifact.modality === 'TABLE' ||
            artifact.modality === 'IMAGE' ||
            artifact.modality === 'MARKDOWN'
        ) {
            this.artifactViewerService.minimised = false
            const { observable, check } = artifactTypeMap[artifact.modality]
            waitForArtifactFetch(observable, check)
        }

        this.artifactViewerService.setName(artifact.name)

        this.artifactService.fetchArtifact(artifact, { setLoading: true })
        this.artifactService.clearLegend()
        this.artifactActivated.emit(artifact)
    }

    addToReport(artifact: ArtifactEntity) {
        event?.stopPropagation()

        const computationBasicInfo: ComputationBasicInfo = {
            correlation_uuid: this.computation.correlation_uuid,
            aoiName: this.computation.aoiName,
            geometry: this.computation.geometry,
            timestamp: this.computation.timestamp,
            pluginId: this.computation.pluginId,
            pluginName: derivePluginNameFromId(this.computation.pluginId || '')
        }

        this.reportService.addArtifact(artifact, computationBasicInfo)
    }
}
