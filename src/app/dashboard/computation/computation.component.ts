import { AnimationEvent, animate, state, style, transition, trigger } from '@angular/animations'
import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output } from '@angular/core'
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

enum DefaultTag {
    ALL = 'all',
    MAIN = 'main',
    UNTAGGED = 'untagged'
}

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
export class ComputationComponent implements OnInit, OnChanges, OnDestroy {
    @Input() computation!: ComputationDisplayEntity
    @Input() activeArtifact?: ArtifactEntity
    @Output() artifactActivated = new EventEmitter<ArtifactEntity>()

    private artifactFetchSubscription: Subscription | undefined
    private reportVisibilitySubscription: Subscription | undefined
    isReportVisible = false

    selectedTag: string = ''
    availableTags: string[] = []
    filteredArtifacts: ArtifactEntity[] = []
    tagCounts: Map<string, number> = new Map()
    shouldShowFilters: boolean = false

    readonly ClipboardPlus = ClipboardPlus
    readonly DefaultTag = DefaultTag

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
        this.initializeTagsAndFiltering()
    }

    ngOnChanges(): void {
        this.initializeTagsAndFiltering()
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
                this.mapService.map?.once('idle', () => {
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

    private initializeTagsAndFiltering(): void {
        if (!this.computation?.artifacts) {
            this.filteredArtifacts = []
            this.availableTags = []
            this.shouldShowFilters = false
            return
        }

        const tagsSet = new Set<string>()
        this.tagCounts.clear()

        const previousSelectedTag = this.selectedTag

        let untaggedCount = 0
        let mainCount = 0

        this.computation.artifacts.forEach(artifact => {
            if (artifact.primary) {
                mainCount++
            }

            if (artifact.tags?.length) {
                artifact.tags.forEach(tag => {
                    tagsSet.add(tag)
                    this.tagCounts.set(tag, (this.tagCounts.get(tag) || 0) + 1)
                })
            } else {
                untaggedCount++
            }
        })

        const hasRegularTags = tagsSet.size > 0
        const hasMixedPrimarySecondary = mainCount > 0 && mainCount < this.computation.artifacts.length

        this.shouldShowFilters = hasRegularTags || hasMixedPrimarySecondary

        const regularTags = Array.from(tagsSet).sort()
        this.availableTags = []

        if (hasMixedPrimarySecondary) {
            this.availableTags.push(DefaultTag.MAIN)
            this.tagCounts.set(DefaultTag.MAIN, mainCount)
        }

        this.availableTags.push(...regularTags)

        this.availableTags.push(DefaultTag.ALL)
        this.tagCounts.set(DefaultTag.ALL, this.computation.artifacts.length)

        if (untaggedCount > 0) {
            this.availableTags.push(DefaultTag.UNTAGGED)
            this.tagCounts.set(DefaultTag.UNTAGGED, untaggedCount)
        }

        if (!previousSelectedTag || !this.availableTags.includes(previousSelectedTag)) {
            if (this.availableTags.length > 0) {
                this.selectedTag = this.availableTags[0]
            }
        } else {
            this.selectedTag = previousSelectedTag
        }

        this.filterArtifacts()
    }

    selectTag(tag: string): void {
        this.selectedTag = tag
        this.filterArtifacts()
    }

    getTagDisplayName(tag: string): string {
        switch (tag) {
            case DefaultTag.UNTAGGED:
                return 'untagged'
            case DefaultTag.ALL:
                return 'all'
            case DefaultTag.MAIN:
                return 'main'
            default:
                return tag
        }
    }

    private filterArtifacts(): void {
        if (!this.computation?.artifacts) {
            this.filteredArtifacts = []
            return
        }

        switch (this.selectedTag) {
            case DefaultTag.ALL:
                this.filteredArtifacts = this.computation.artifacts.slice()
                break
            case DefaultTag.MAIN:
                this.filteredArtifacts = this.computation.artifacts.filter(artifact => artifact.primary === true)
                break
            case DefaultTag.UNTAGGED:
                this.filteredArtifacts = this.computation.artifacts.filter(
                    artifact => !artifact.tags || artifact.tags.length === 0
                )
                break
            default:
                this.filteredArtifacts = this.computation.artifacts.filter(artifact =>
                    artifact.tags?.includes(this.selectedTag)
                )
        }
    }
}
