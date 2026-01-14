import { AnimationEvent, animate, state, style, transition, trigger } from '@angular/animations'
import { CommonModule } from '@angular/common'
import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    TemplateRef,
    ViewChild,
    inject
} from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { formatSourceText } from '@app/utils/source.utils'
import { derivePluginNameFromId } from '@app/utils/string.utils'
import { environment } from '@environments/environment'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import { TippyDirective } from '@ngneat/helipopper'
import { CircleX, ClipboardPlus, Download, LucideAngularModule, Pin, PinOff, ReceiptText, X } from 'lucide-angular'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ToastrService } from 'ngx-toastr'
import { Observable, Subscription } from 'rxjs'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactData, ArtifactEntity, ChartData, PlotlyChartData } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { MarkdownComponent } from '../artifact/markdown/markdown.component'
import { ComputationBasicInfo, ComputationDisplayEntity } from '../computations-index/computation.interface'
import { MapArtifactManagerService } from '../map/map-artifact-manager.service'
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
    imports: [
        CommonModule,
        LucideAngularModule,
        MatIconModule,
        TippyDirective,
        TranslocoModule,
        MarkdownComponent,
        NgScrollbarModule
    ],
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
    artifactService = inject(ArtifactService)
    private pluginService = inject(PluginService)
    private mapService = inject(MapService)
    mapArtifactManager = inject(MapArtifactManagerService)
    private reportService = inject(ReportService)
    private artifactViewerService = inject(ArtifactViewerService)
    private toastr = inject(ToastrService)
    private translocoService = inject(TranslocoService)
    private dialog = inject(MatDialog)

    @Input() computation!: ComputationDisplayEntity
    @Input() activeArtifact?: ArtifactEntity
    @Output() artifactActivated = new EventEmitter<ArtifactEntity>()

    @ViewChild('descriptionDialog') descriptionDialog!: TemplateRef<{
        description: string
        sources: ArtifactEntity['sources']
    }>

    private artifactFetchSubscription: Subscription | undefined
    private reportVisibilitySubscription: Subscription | undefined
    isReportVisible = false

    selectedTag: string = ''
    availableTags: string[] = []
    filteredArtifacts: ArtifactEntity[] = []
    tagCounts: Map<string, number> = new Map()
    shouldShowFilters: boolean = false

    readonly ClipboardPlus = ClipboardPlus
    readonly Download = Download
    readonly ReceiptText = ReceiptText
    readonly CircleX = CircleX
    readonly Pin = Pin
    readonly PinOff = PinOff
    readonly X = X
    readonly DefaultTag = DefaultTag

    formatSourceText = formatSourceText

    ngOnInit(): void {
        this.reportVisibilitySubscription = this.reportService.isVisible$.subscribe(isVisible => {
            this.isReportVisible = isVisible
        })
        this.initializeTagsAndFiltering()
    }

    ngOnDestroy(): void {
        this.artifactFetchSubscription?.unsubscribe()
        this.reportVisibilitySubscription?.unsubscribe()
    }

    onAnimationStart(event: AnimationEvent, computation: ComputationDisplayEntity) {
        if (event.toState === 'collapsed') {
            this.mapArtifactManager.clearTransientArtifacts(computation.correlation_uuid)
        }
    }

    onAnimationEvent(event: AnimationEvent, computation: ComputationDisplayEntity) {
        if (event.toState === 'collapsed') {
            computation.keepInDOM = false
        }
    }

    viewArtifact(artifact: ArtifactEntity): void {
        if (this.isReportVisible) {
            this.toastr.warning(this.translocoService.translate('computation.pleaseExitReportBuilder'), '', {
                timeOut: 4000
            })
            return
        }

        const isMapArtifact = this.mapArtifactManager.isMapArtifact(artifact.modality)

        if (isMapArtifact) {
            const added = this.mapArtifactManager.setTransientArtifact(
                artifact,
                this.computation.correlation_uuid,
                this.computation.geometry
            )
            if (!added) {
                this.showToast(
                    'warning',
                    'computation.toast.mapLayerLimitMessage',
                    'computation.toast.mapLayerLimitTitle'
                )
                return
            }
        } else {
            this.mapArtifactManager.clearTransientArtifacts()
        }

        this.renderArtifact(artifact)
    }

    pinArtifact(artifact: ArtifactEntity): void {
        if (!this.mapArtifactManager.isMapArtifact(artifact.modality)) return
        if (this.mapArtifactManager.isArtifactPersisted(artifact)) return

        if (this.mapArtifactManager.isArtifactOnMap(artifact)) {
            if (!this.mapArtifactManager.promoteToPin(artifact)) return
            this.showToast('success', 'computation.toast.layerPinnedMessage', 'computation.toast.layerPinnedTitle', {
                name: artifact.name
            })
            return
        }

        const added = this.mapArtifactManager.addMapArtifact(artifact, {
            pinned: true,
            computationGeometry: this.computation.geometry,
            computationId: this.computation.correlation_uuid
        })
        if (!added) return

        this.renderArtifact(artifact)
        this.showToast('success', 'computation.toast.layerPinnedMessage', 'computation.toast.layerPinnedTitle', {
            name: artifact.name
        })
    }

    unpinArtifact(artifact: ArtifactEntity): void {
        if (!this.mapArtifactManager.isMapArtifact(artifact.modality)) return
        if (!this.mapArtifactManager.unpinArtifact(artifact, this.computation.correlation_uuid)) return

        if (!this.activeArtifact || !this.isSameArtifact(this.activeArtifact, artifact)) {
            this.removeMapArtifact(artifact)
        }
        this.showToast('info', 'computation.toast.layerUnpinnedMessage', 'computation.toast.layerUnpinnedTitle', {
            name: artifact.name
        })
    }

    private removeMapArtifact(artifact: ArtifactEntity): void {
        const layerInfo = this.mapArtifactManager.getLayerInfo(artifact)
        if (layerInfo?.layerIds && layerInfo.sourceId) {
            if (artifact.modality === 'VECTOR_MAP_LAYER') {
                this.mapService.removeVectorLayer({
                    layerIds: layerInfo.layerIds,
                    sourceId: layerInfo.sourceId,
                    name: artifact.name
                })
            } else if (artifact.modality === 'RASTER_MAP_LAYER' && layerInfo.layerIds[0]) {
                this.mapService.removeGeoTiffLayer(layerInfo.layerIds[0], layerInfo.sourceId)
            }
        }
        this.mapArtifactManager.removeMapArtifact(artifact)
    }

    private renderArtifact(artifact: ArtifactEntity) {
        const isMapArtifact = this.mapArtifactManager.isMapArtifact(artifact.modality)

        this.pluginService.collapsePluginCatalog()

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
            this.artifactFetchSubscription?.unsubscribe()
            this.artifactFetchSubscription = observable.subscribe({
                next: data => {
                    if (dataCheck(data)) {
                        artifact.isLoading = false
                        this.artifactFetchSubscription?.unsubscribe()
                        this.artifactFetchSubscription = undefined
                    }
                },
                error: err => {
                    console.error('Error fetching artifact:', err)
                    artifact.isLoading = false
                    this.artifactFetchSubscription?.unsubscribe()
                    this.artifactFetchSubscription = undefined
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

        if (artifact.modality === 'VECTOR_MAP_LAYER' || artifact.modality === 'RASTER_MAP_LAYER') {
            this.artifactViewerService.isViewerVisible = false
            waitForMapRender(artifact)
        } else if (
            artifact.modality === 'CHART' ||
            artifact.modality === 'CHART_PLOTLY' ||
            artifact.modality === 'TABLE' ||
            artifact.modality === 'IMAGE' ||
            artifact.modality === 'MARKDOWN'
        ) {
            this.artifactViewerService.isViewerVisible = true
            this.artifactViewerService.minimised = false
            const { observable, check } = artifactTypeMap[artifact.modality]
            waitForArtifactFetch(observable, check)
        }

        this.artifactViewerService.setName(artifact.name)

        this.artifactService.fetchArtifact(artifact, { setLoading: true })

        if (!isMapArtifact || this.mapArtifactManager.getActiveMapArtifacts().length === 0) {
            this.artifactService.clearLegend()
        }

        this.artifactActivated.emit(artifact)
    }

    addToReport(artifact: ArtifactEntity) {
        event?.stopPropagation()

        const computationBasicInfo: ComputationBasicInfo = {
            correlation_uuid: this.computation.correlation_uuid,
            aoiName: this.computation.aoiName,
            geometry: this.computation.geometry,
            request_ts: this.computation.request_ts,
            pluginId: this.computation.pluginId,
            pluginName: derivePluginNameFromId(this.computation.pluginId || '')
        }

        this.reportService.addArtifact(artifact, computationBasicInfo)
    }

    downloadContent(artifact: ArtifactEntity, event?: Event): void {
        event?.stopPropagation()

        const apiUrl = environment.climateActionApiUrl
        const artifactUrl = `${apiUrl}/store/${artifact.correlation_uuid}/${artifact.filename}`

        let filename = 'download'
        if (artifact.modality === 'CHART' || artifact.modality === 'CHART_PLOTLY') {
            filename = 'data.json'
        } else {
            filename = this.getFileName(artifactUrl)
        }

        const a = document.createElement('a')
        a.href = artifactUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    private getFileName(url: string): string {
        return url.split('/').pop() || 'download'
    }

    viewDescription(artifact: ArtifactEntity, event?: Event): void {
        event?.stopPropagation()

        this.dialog.open(this.descriptionDialog, {
            data: { description: artifact.description, sources: artifact.sources },
            autoFocus: false
        })
    }

    closeDescriptionDialog(): void {
        this.dialog.closeAll()
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
            } else if (!artifact.primary) {
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

        if (untaggedCount > 0) {
            this.availableTags.push(DefaultTag.UNTAGGED)
            this.tagCounts.set(DefaultTag.UNTAGGED, untaggedCount)
        }

        this.availableTags.push(DefaultTag.ALL)
        this.tagCounts.set(DefaultTag.ALL, this.computation.artifacts.length)

        if (this.availableTags.length > 0) {
            this.selectedTag = this.availableTags[0]
        }

        this.filterArtifacts()
    }

    selectTag(tag: string): void {
        this.selectedTag = tag
        this.filterArtifacts()
    }

    getTagDisplayName(tag: string): string {
        return tag
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
                    artifact => (!artifact.tags || artifact.tags.length === 0) && !artifact.primary
                )
                break
            default:
                this.filteredArtifacts = this.computation.artifacts.filter(artifact =>
                    artifact.tags?.includes(this.selectedTag)
                )
        }
    }

    getMapButtonState(artifact: ArtifactEntity): 'pin' | 'unpin' | 'disabled' | null {
        if (!this.mapArtifactManager.isMapArtifact(artifact.modality)) return null

        if (this.mapArtifactManager.isArtifactPersisted(artifact)) {
            return 'unpin'
        }

        const pinnedCount = this.mapArtifactManager.getActiveMapArtifacts().filter(layer => layer.pinned).length
        if (pinnedCount >= this.mapArtifactManager.MAX_MAP_ARTIFACTS) {
            return 'disabled'
        }

        return 'pin'
    }

    getMapButtonTooltip(artifact: ArtifactEntity): string {
        const state = this.getMapButtonState(artifact)
        switch (state) {
            case 'unpin':
                return this.translocoService.translate('computation.tooltip.unpinLayer')
            case 'pin':
                return this.translocoService.translate('computation.tooltip.pinLayer')
            case 'disabled':
                return this.translocoService.translate('computation.tooltip.pinLimitReached')
            default:
                return ''
        }
    }

    toggleMapArtifact(artifact: ArtifactEntity, event: Event): void {
        event.stopPropagation()

        const state = this.getMapButtonState(artifact)
        if (state === null) {
            return
        }

        switch (state) {
            case 'disabled':
                this.showToast(
                    'warning',
                    'computation.toast.mapLayerLimitMessage',
                    'computation.toast.mapLayerLimitTitle'
                )
                return
            case 'unpin':
                this.unpinArtifact(artifact)
                return
            case 'pin':
                this.pinArtifact(artifact)
                return
            default:
                return
        }
    }

    private showToast(
        type: 'success' | 'info' | 'warning',
        messageKey: string,
        titleKey: string,
        params?: Record<string, string>,
        timeOut = 2000
    ): void {
        const message = this.translocoService.translate(messageKey, params)
        const title = this.translocoService.translate(titleKey)
        this.toastr[type](message, title, { timeOut })
    }

    private isSameArtifact(a: ArtifactEntity, b: ArtifactEntity): boolean {
        return a.correlation_uuid === b.correlation_uuid && a.filename === b.filename
    }
}
