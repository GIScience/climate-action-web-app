import { animate, state, style, transition, trigger } from '@angular/animations'
import { CommonModule, NgClass } from '@angular/common'
import {
    ChangeDetectorRef,
    Component,
    computed,
    DestroyRef,
    inject,
    Input,
    OnDestroy,
    OnInit,
    signal,
    TemplateRef,
    ViewChild
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { ActivatedRoute } from '@angular/router'
import { AppwriteService } from '@app/auth/appwrite.service'
import { StorageService } from '@app/storage.service'
import { SupportedLanguage } from '@app/types/language.types'
import { getDateFnsLocale } from '@app/utils/locale.utils'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import {
    LucideBookmark,
    LucideCheck,
    LucideClock,
    LucideFileExclamationPoint,
    LucideHash,
    LucideImport,
    LucideListTodo,
    LucideLoader,
    LucideLoaderCircle,
    LucideMessageSquareWarning,
    LucideShare2,
    LucideX
} from '@lucide/angular'
import { TippyDirective } from '@ngneat/helipopper'
import { Models } from 'appwrite'
import { compareDesc, format } from 'date-fns'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom } from 'rxjs'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactEntity } from '../artifact/artifact.interface'
import { isPendingStatus, statusRank } from '../common/status-rank.util'
import { ComputationComponent } from '../computation/computation.component'
import { MapArtifactManagerService } from '../map/map-artifact-manager.service'
import { MapService } from '../map/map.service'
import { AOI_ORIGINAL_TYPES, ExternalInput, Plugin } from '../plugin/plugin.interface'
import { PluginService } from '../plugin/plugin.service'
import { ReportService } from '../report/report.service'
import { ShareService } from '../share/share.service'
import { FilterByCriteriaPipe } from './computation-filters.pipe'
import {
    formatParameterName,
    getParameterEntries,
    hasUserRequestedParams,
    isUserRequestedParam
} from './computation-parameter.utils'
import { ComputationSearchService } from './computation-search.service'
import { ComputationSyncService } from './computation-sync.service'
import {
    ComputationDatabaseEntity,
    ComputationDisplayEntity,
    ComputationMetadata,
    ComputationParameters,
    DiscoverTab
} from './computation.interface'
import { mapDatabaseComputation, mapHydratedComputation } from './computation.mapper'

@Component({
    selector: 'app-computations-index',
    imports: [
        MatIconModule,
        TippyDirective,
        NgClass,
        CommonModule,
        NgScrollbarModule,
        FilterByCriteriaPipe,
        LucideBookmark,
        LucideCheck,
        LucideClock,
        LucideFileExclamationPoint,
        LucideHash,
        LucideImport,
        LucideListTodo,
        LucideLoader,
        LucideLoaderCircle,
        LucideMessageSquareWarning,
        LucideShare2,
        LucideX,
        ComputationComponent,
        TranslocoModule
    ],
    animations: [
        trigger('expandCollapse', [
            state(
                'collapsed',
                style({
                    height: '0',
                    padding: '0',
                    visibility: 'hidden'
                })
            ),
            state(
                'expanded',
                style({
                    height: '*',
                    padding: '*',
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
    templateUrl: './computations-index.component.html',
    styleUrl: './computations-index.component.scss',
    providers: [ComputationSearchService, ComputationSyncService]
})
export class ComputationsIndexComponent implements OnInit, OnDestroy {
    private pluginService = inject(PluginService)
    artifactViewerService = inject(ArtifactViewerService)
    private mapService = inject(MapService)
    private mapArtifactManager = inject(MapArtifactManagerService)
    private searchService = inject(ComputationSearchService)
    private route = inject(ActivatedRoute)
    private shareService = inject(ShareService)
    private toastr = inject(ToastrService)
    private dialog = inject(MatDialog)
    private storageService = inject(StorageService)
    private appwriteService = inject(AppwriteService)
    private reportService = inject(ReportService)
    private translocoService = inject(TranslocoService)
    private cdr = inject(ChangeDetectorRef)
    private syncService = inject(ComputationSyncService)
    private destroyRef = inject(DestroyRef)

    readonly runs = signal<ComputationDisplayEntity[]>([])
    readonly scheduled = computed(() => this.runs().filter(run => isPendingStatus(run.status)))
    readonly completed = computed(() =>
        this.runs()
            .filter(run => run.status === 'SUCCESS')
            .sort((a, b) => compareDesc(new Date(a.request_ts?.valueOf() || 0), new Date(b.request_ts?.valueOf() || 0)))
    )
    private readonly bookmarkedIds = computed(() => new Set(this.runs().map(run => run.correlation_uuid)))
    activeComputation?: ComputationDisplayEntity
    private activationToken = 0
    private _activeArtifact?: ArtifactEntity

    newRuns: string[] = []
    importedRuns: string[] = []
    isReportVisible = false

    paginationInfo: { hasMore: boolean; loading: boolean } = {
        hasMore: true,
        loading: false
    }

    activeTab: DiscoverTab = this.storageService.getActiveTab('discover')
    readonly searchComputations = this.searchService.computations
    readonly searchLoading = this.searchService.loading
    readonly searchHasMore = this.searchService.hasMore

    @Input() pluginId: string = ''
    @Input() plugin?: Plugin
    pluginLanguage: SupportedLanguage = SupportedLanguage.EN

    @ViewChild('parametersDialog') parametersDialog!: TemplateRef<{
        params: ComputationParameters
    }>

    @ViewChild('artifactErrorsTooltip') artifactErrorsTooltip!: TemplateRef<{
        artifactErrors: ComputationDisplayEntity['artifact_errors']
    }>

    get activeArtifact(): ArtifactEntity | undefined {
        return this._activeArtifact
    }

    user: Models.User<Models.Preferences> | null = null

    constructor() {
        this.appwriteService._user.pipe(takeUntilDestroyed()).subscribe(user => {
            this.user = user
        })

        this.pluginId = this.route.snapshot.params['name']

        if (this.pluginService.computeState$) {
            this.pluginService.computeState$.pipe(takeUntilDestroyed()).subscribe(value => {
                if (value === 'compute-ready') {
                    this.collapseComputation()
                }
            })
        }
    }

    formatTimestamp(timestamp: Date | string) {
        const date =
            typeof timestamp === 'string'
                ? new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(timestamp) ? timestamp : timestamp + 'Z')
                : timestamp
        const lang = this.translocoService.getActiveLang()
        return format(date, this.getDatePattern(lang), { locale: getDateFnsLocale(lang) })
    }

    private getDatePattern(lang: string): string {
        switch (lang) {
            case SupportedLanguage.DE:
                return 'd. MMM yyyy, HH:mm'
            default:
                return 'd MMM yyyy, h:mm a'
        }
    }

    formatUUID(correlation_uuid: string): string {
        return correlation_uuid.substring(0, 8)
    }

    ngOnInit(): void {
        this.pluginLanguage = this.plugin?.language ?? SupportedLanguage.EN

        this.loadInitialPluginRuns()

        if (this.activeTab === 'discover') {
            this.searchService.ensureLoaded(this.pluginId)
            this.searchService.showSearchLayers(this.pluginId)
        }

        this.shareService
            .onComputationToImport()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(computationId => {
                if (computationId) {
                    this.importComputation(computationId)
                }
            })

        this.syncService.transitions$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(transition => this.transitionRunStatus(transition.run, transition.newStatus, transition.message))

        this.pluginService
            .getPluginRuns()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.refreshRunsFromStorage()
            })

        this.reportService.isVisible$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(isVisible => {
            this.isReportVisible = isVisible
        })

        this.artifactViewerService.isViewerVisible$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(isVisible => {
            if (!isVisible && this._activeArtifact) {
                this._activeArtifact = undefined
                this.mapArtifactManager.setActiveArtifactId(null)
            }
        })

        this.mapArtifactManager.activeMapArtifacts$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(layers => {
            if (this._activeArtifact) {
                const stillOnMap = layers.some(
                    l =>
                        l.artifact.correlation_uuid === this._activeArtifact!.correlation_uuid &&
                        l.artifact.filename === this._activeArtifact!.filename
                )
                if (!stillOnMap) {
                    this._activeArtifact = undefined
                    this.mapArtifactManager.setActiveArtifactId(null)
                }
            }
        })
    }

    ngOnDestroy(): void {
        if (this.activeComputation) {
            this.artifactViewerService.closeArtifactViewer()
            this.mapService.removeFocusedLayer()
        }
    }

    private async loadRuns(isInitialLoad: boolean = true): Promise<void> {
        if (!isInitialLoad && (!this.paginationInfo.hasMore || this.paginationInfo.loading)) return

        try {
            this.paginationInfo = { hasMore: true, loading: true }

            const result = await this.storageService.getPluginRunsPaginated(this.pluginId, isInitialLoad)

            this.paginationInfo = { hasMore: result.hasMore, loading: false }

            this.handleActiveRunsResult(result.documents, isInitialLoad)
        } catch (error) {
            console.error(`Error loading ${isInitialLoad ? 'initial' : 'more'} runs:`, error)
        }
    }

    private handleActiveRunsResult(documents: ComputationDatabaseEntity[], isInitialLoad: boolean): void {
        this.upsertRuns(documents)
        this.updateNewRuns(documents)

        if (isInitialLoad) {
            this.startPeriodicSync()
        }
    }

    private updateNewRuns(documents: ComputationDatabaseEntity[]): void {
        const newRunsFromData = documents.filter(run => run.flags?.includes('NEW')).map(run => run.correlation_uuid)
        this.newRuns = [...new Set([...this.newRuns, ...newRunsFromData])]
    }

    private refreshRunsFromStorage(): void {
        const stored = this.storageService
            .getComputesByStatus(['PENDING', 'STARTED', 'SUCCESS'])
            .filter(run => run.pluginId === this.pluginId)

        this.upsertRuns(stored)

        const storedIds = new Set(stored.map(run => run.correlation_uuid))
        this.runs.update(list =>
            list.filter(run => !isPendingStatus(run.status) || storedIds.has(run.correlation_uuid))
        )
    }

    private upsertRuns(entities: ComputationDatabaseEntity[]): void {
        if (entities.length === 0) return

        this.runs.update(list => {
            const byId = new Map(list.map(run => [run.correlation_uuid, run]))
            const additions: ComputationDisplayEntity[] = []

            for (const entity of entities) {
                const existing = byId.get(entity.correlation_uuid)
                if (existing) {
                    if (statusRank(entity.status) >= statusRank(existing.status)) {
                        existing.status = entity.status
                    }
                    existing.flags = entity.flags ?? existing.flags
                } else if (isPendingStatus(entity.status) || entity.status === 'SUCCESS') {
                    additions.push(mapDatabaseComputation(entity))
                }
            }

            return [...list, ...additions]
        })
    }

    private async loadInitialPluginRuns(): Promise<void> {
        await this.loadRuns(true)
    }

    readonly loadMoreBookmarks = () => void this.loadRuns(false)
    readonly loadMoreSearch = () => this.searchService.loadMore()

    switchTab(tab: DiscoverTab): void {
        if (tab === this.activeTab) return
        this.collapseComputation()
        this.activeTab = tab
        this.storageService.saveActiveTab(tab)
        if (tab === 'discover') {
            this.searchService.ensureLoaded(this.pluginId)
            this.searchService.showSearchLayers(this.pluginId)
        } else {
            this.searchService.hideSearchLayers()
        }
    }

    getAppwriteUrl(path: string): string {
        return this.appwriteService.getAppwriteUrl(path)
    }

    getRedirectUrl(): string {
        return this.appwriteService.getRedirectUrl()
    }

    private transitionRunStatus(
        run: ComputationDatabaseEntity,
        newStatus: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE',
        message?: string
    ) {
        this.pluginService.updateRunStatus(run.correlation_uuid, newStatus)

        run.status = newStatus
        this.upsertRuns([run])

        if (newStatus === 'SUCCESS') {
            this.searchService.markStale()
            this.storageService.markAsNew(run.correlation_uuid)
            if (!this.newRuns.includes(run.correlation_uuid)) {
                this.newRuns.push(run.correlation_uuid)
            }
            this.toastr.success(
                `<strong>${this.pluginService.getPluginNameById(run.pluginId || '')}</strong> computation for <strong>${run.aoiName}</strong> (ID: #${this.formatUUID(run.correlation_uuid)}) has completed successfully.`,
                '',
                {
                    timeOut: 7000,
                    enableHtml: true
                }
            )
        } else if (newStatus === 'FAILURE') {
            this.toastr.error(
                `Error while computing <strong>${this.pluginService.getPluginNameById(run.pluginId || '')}</strong> for <strong>${run.aoiName}</strong> (ID: #${this.formatUUID(run.correlation_uuid)})${message ? ' - ' + message : ''}.`,
                '',
                {
                    disableTimeOut: true,
                    enableHtml: true
                }
            )
        }
    }

    private async ensureHydrated(computation: ComputationDisplayEntity): Promise<ComputationDisplayEntity> {
        if (computation.hydrated) return computation

        try {
            const response = await firstValueFrom(
                this.pluginService.getComputationMetadata(computation.correlation_uuid)
            )
            const hydratedComputation = mapHydratedComputation(computation, response)
            this.runs.update(runs =>
                runs.map(run =>
                    run.correlation_uuid === hydratedComputation.correlation_uuid ? hydratedComputation : run
                )
            )
            this.searchService.updateComputation(hydratedComputation)
            return hydratedComputation
        } catch (error) {
            console.error('Error fetching computation metadata for:', computation.correlation_uuid, error)
            this.toastr.error(this.translocoService.translate('computationsIndex.errorLoadingComputation'), '', {
                timeOut: 5000
            })
            throw error
        }
    }

    removeNewRunMark(correlation_uuid: string) {
        this.storageService.markAsViewed(correlation_uuid)
        this.newRuns = this.newRuns.filter(id => id !== correlation_uuid)
    }

    removeImportedRunMark(correlation_uuid: string) {
        this.importedRuns = this.importedRuns.filter(id => id !== correlation_uuid)
    }

    async toggleComputation(computation: ComputationDisplayEntity) {
        if (this.pluginService.computeState$) {
            this.pluginService.setComputeState('inactive')
        }
        this.pluginService.collapsePluginCatalog()
        const token = ++this.activationToken
        const previousActiveComputation = this.activeComputation

        if (previousActiveComputation) {
            previousActiveComputation.isExpanded = false
            setTimeout(() => (previousActiveComputation.keepInDOM = false), 300)
            this.artifactViewerService.closeArtifactViewer()
            this.mapService.removeFocusedLayer()
        }

        if (previousActiveComputation === computation) {
            this.activeComputation = undefined
            this._activeArtifact = undefined
            this.mapArtifactManager.setActiveArtifactId(null)
            if (this.activeTab === 'discover') {
                this.searchService.showSearchLayers(this.pluginId)
            }
            return
        }

        computation.loading = !computation.hydrated

        try {
            computation = await this.ensureHydrated(computation)
        } catch {
            if (token === this.activationToken) {
                this.activeComputation = undefined
                if (this.activeTab === 'discover') {
                    this.searchService.showSearchLayers(this.pluginId)
                }
            }
            return
        } finally {
            computation.loading = false
        }

        if (token !== this.activationToken) return

        computation.keepInDOM = true
        setTimeout(() => (computation.isExpanded = true), 0)
        this.activeComputation = computation

        if (this.activeTab === 'discover') {
            this.searchService.hideSearchLayers()
        }

        if (computation?.geometry) {
            const extent = this.mapService.highlightAoI(computation.geometry)

            if (extent) {
                this.mapService.flyToExtent(extent)
            }
        }

        if (this.newRuns.includes(computation.correlation_uuid)) {
            this.removeNewRunMark(computation.correlation_uuid)
        }

        if (this.importedRuns.includes(computation.correlation_uuid)) {
            this.removeImportedRunMark(computation.correlation_uuid)
        }

        this.cdr.markForCheck()
    }

    collapseComputation() {
        this.activationToken++
        const previousActiveComputation = this.activeComputation

        if (previousActiveComputation) {
            previousActiveComputation.isExpanded = false
            setTimeout(() => (previousActiveComputation.keepInDOM = false), 300)
            this.artifactViewerService.closeArtifactViewer()
            this.mapService.removeFocusedLayer()
            this.activeComputation = undefined
            if (this.activeTab === 'discover') {
                this.searchService.showSearchLayers(this.pluginId)
            }
        }
    }
    shareComputation(correlation_uuid: string, event: Event) {
        event.stopPropagation()

        const shareLink = this.shareService.getShareUrl(correlation_uuid)

        navigator.clipboard.writeText(shareLink)
        this.toastr.info('Computation link copied to clipboard', '', {
            timeOut: 4000
        })
    }
    isBookmarked(correlation_uuid: string): boolean {
        return this.bookmarkedIds().has(correlation_uuid)
    }

    toggleBookmark(computation: ComputationDisplayEntity, event: Event): void {
        event.stopPropagation()
        if (this.isBookmarked(computation.correlation_uuid)) {
            if (
                this.isCustomAoi(computation) &&
                !confirm(this.translocoService.translate('computationsIndex.unbookmarkCustomAoiConfirm'))
            ) {
                return
            }
            this.removeBookmark(computation.correlation_uuid)
        } else {
            this.addBookmark(computation)
        }
    }

    private isCustomAoi(computation: ComputationDisplayEntity): boolean {
        if (computation.flags?.includes('CUSTOM_AOI')) return true

        // Older boundary computations lack original_type entirely,
        // so absence counts as a boundary.
        const originalType = computation.geometry?.properties?.['original_type']
        return !!originalType && originalType !== AOI_ORIGINAL_TYPES[ExternalInput.Boundary]
    }

    private async addBookmark(computation: ComputationDisplayEntity): Promise<void> {
        if (this.isBookmarked(computation.correlation_uuid)) return

        const entity: ComputationDatabaseEntity = {
            correlation_uuid: computation.correlation_uuid,
            request_ts: computation.request_ts,
            status: 'SUCCESS',
            aoiName: computation.aoiName,
            pluginId: computation.pluginId,
            language: computation.language
        }

        await this.pluginService.storeNewComputes(entity)
        this.upsertRuns([entity])
        this.toastr.success(this.translocoService.translate('computationsIndex.bookmarkAdded'), '', {
            timeOut: 3000
        })
    }

    private async removeBookmark(correlation_uuid: string): Promise<void> {
        if (this.activeComputation?.correlation_uuid === correlation_uuid) {
            this.collapseComputation()
        }

        await this.storageService.deleteComputation(correlation_uuid)

        this.runs.update(list => list.filter(run => run.correlation_uuid !== correlation_uuid))
        this.newRuns = this.newRuns.filter(id => id !== correlation_uuid)
        this.importedRuns = this.importedRuns.filter(id => id !== correlation_uuid)

        this.toastr.info(this.translocoService.translate('computationsIndex.bookmarkRemoved'), '', {
            timeOut: 3000
        })
    }

    storeActiveArtifact(artifact: ArtifactEntity) {
        if (artifact) {
            this._activeArtifact = artifact
            this.mapArtifactManager.setActiveArtifactId(artifact)
        } else {
            console.error('Cannot set active artifact: ', artifact)
        }
    }

    viewParameters(computation: ComputationDisplayEntity, event?: Event) {
        event?.stopPropagation()
        this.dialog.open(this.parametersDialog, {
            data: {
                params: computation.params,
                requestedParams: computation.requested_params
            },
            autoFocus: false
        })
    }

    closeDialog() {
        this.dialog.closeAll()
    }

    private startPeriodicSync() {
        this.syncService.start(() => this.runs().filter(run => isPendingStatus(run.status)))
    }

    // Pure parameter-formatting helpers live in computation-parameter.utils.ts.
    getParameterEntries = getParameterEntries
    isUserRequestedParam = isUserRequestedParam
    hasUserRequestedParams = hasUserRequestedParams
    formatParameterName = formatParameterName

    importComputation(correlationUuid: string): void {
        if (this.isBookmarked(correlationUuid)) {
            this.toastr.warning(
                this.translocoService.translate('computationsIndex.computationAlreadyPresent', {
                    id: this.formatUUID(correlationUuid)
                }),
                '',
                {
                    timeOut: 4000
                }
            )
            return
        }

        this.switchTab('bookmarks')

        this.pluginService.getComputationMetadata(correlationUuid).subscribe({
            next: (response: ComputationMetadata) => {
                const computation: ComputationDatabaseEntity = {
                    correlation_uuid: correlationUuid,
                    pluginId: response.plugin_info?.id,
                    request_ts: response.request_ts,
                    status: 'SUCCESS',
                    aoiName: response.aoi?.properties?.['name'] as string | undefined,
                    language: response.language,
                    flags: ['IMPORTED']
                }

                this.pluginService
                    .storeNewComputes(computation)
                    .then(() => {
                        this.upsertRuns([computation])
                        this.importedRuns = [...this.importedRuns, correlationUuid]
                        this.toastr.success(
                            this.translocoService.translate('computationsIndex.computationImported', {
                                id: this.formatUUID(correlationUuid)
                            }),
                            '',
                            {
                                timeOut: 4000
                            }
                        )
                    })
                    .catch(error => {
                        console.error('Failed to store imported computation:', error)
                        this.toastr.error(
                            this.translocoService.translate('computationsIndex.errorImportingComputation'),
                            '',
                            {
                                disableTimeOut: true
                            }
                        )
                    })
            },
            error: error => {
                console.error('Error importing computation:', error)
                this.toastr.error(this.translocoService.translate('computationsIndex.errorImportingComputation'), '', {
                    disableTimeOut: true
                })
            }
        })
    }

    openReport() {
        this.reportService.openReport()
    }

    closeReport() {
        this.reportService.closeReport()
    }

    hasArtifactErrors(artifactErrors: ComputationDisplayEntity['artifact_errors']): boolean {
        return !!(artifactErrors && Object.keys(artifactErrors).length > 0)
    }

    getArtifactErrorEntries(artifactErrors: ComputationDisplayEntity['artifact_errors']): [string, string][] {
        if (!artifactErrors || Object.keys(artifactErrors).length === 0) {
            return []
        }
        return Object.entries(artifactErrors)
    }

    getLanguageMismatchTooltip(computation: Pick<ComputationDisplayEntity, 'language'>): string | null {
        const computationLanguage = computation.language ?? SupportedLanguage.EN
        const currentLanguage = this.translocoService.getActiveLang() as SupportedLanguage
        const pluginLanguage = this.pluginLanguage ?? SupportedLanguage.EN

        if (computationLanguage === currentLanguage) {
            return null
        }

        const getLanguageLabel = (language: SupportedLanguage): string => {
            const displayNames = new Intl.DisplayNames([currentLanguage], { type: 'language' })
            return displayNames.of(language) ?? language
        }

        const translationKey =
            pluginLanguage === currentLanguage
                ? 'computationsIndex.languageMismatch'
                : 'computationsIndex.languageMismatchPluginOnly'

        return this.translocoService.translate(translationKey, {
            language: getLanguageLabel(computationLanguage),
            currentLanguage: getLanguageLabel(currentLanguage),
            pluginLanguage: getLanguageLabel(pluginLanguage)
        })
    }
}
