import { animate, state, style, transition, trigger } from '@angular/animations'
import { CommonModule, NgClass } from '@angular/common'
import {
    ChangeDetectorRef,
    Component,
    computed,
    inject,
    Input,
    OnDestroy,
    OnInit,
    signal,
    TemplateRef,
    ViewChild
} from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { ActivatedRoute } from '@angular/router'
import { AppwriteService } from '@app/auth/appwrite.service'
import { DatabaseService } from '@app/database.service'
import { DropdownMenuDirective } from '@app/shared/dropdown-menu.directive'
import { StorageService } from '@app/storage.service'
import { SupportedLanguage } from '@app/types/language.types'
import { getDateFnsLocale } from '@app/utils/locale.utils'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import { TippyDirective } from '@ngneat/helipopper'
import { Models } from 'appwrite'
import { compareDesc, format } from 'date-fns'
import {
    Archive,
    ArchiveRestore,
    Check,
    CircleArrowLeft,
    CircleX,
    Clipboard,
    Clock,
    EllipsisVertical,
    FileWarning,
    Hash,
    Import,
    ListTodo,
    Loader,
    LoaderCircle,
    LucideAngularModule,
    MessageSquareWarning,
    Share2,
    Trash2,
    X
} from 'lucide-angular'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom, Subscription } from 'rxjs'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactEntity } from '../artifact/artifact.interface'
import { ComputationComponent } from '../computation/computation.component'
import { MapArtifactManagerService } from '../map/map-artifact-manager.service'
import { MapService } from '../map/map.service'
import { DemoConfig, Plugin } from '../plugin/plugin.interface'
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
import { ComputationSyncService } from './computation-sync.service'
import {
    ComputationDatabaseEntity,
    ComputationDisplayEntity,
    ComputationMetadata,
    ComputationParameters
} from './computation.interface'
import { mapDatabaseComputation, mapHydratedComputation } from './computation.mapper'

const STATUS_RANK: { [status: string]: number } = {
    PENDING: 0,
    RETRY: 1,
    STARTED: 1,
    SUCCESS: 2,
    FAILURE: 2,
    REVOKED: 2
}

function statusRank(status: string): number {
    return STATUS_RANK[status] ?? 0
}

function isPendingStatus(status: ComputationDisplayEntity['status']): boolean {
    return status === 'PENDING' || status === 'STARTED'
}

@Component({
    selector: 'app-computations-index',
    imports: [
        MatIconModule,
        TippyDirective,
        NgClass,
        CommonModule,
        NgScrollbarModule,
        FilterByCriteriaPipe,
        LucideAngularModule,
        ComputationComponent,
        TranslocoModule,
        DropdownMenuDirective
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
    providers: [ComputationSyncService]
})
export class ComputationsIndexComponent implements OnInit, OnDestroy {
    private pluginService = inject(PluginService)
    artifactViewerService = inject(ArtifactViewerService)
    private mapService = inject(MapService)
    private mapArtifactManager = inject(MapArtifactManagerService)
    private route = inject(ActivatedRoute)
    private shareService = inject(ShareService)
    private toastr = inject(ToastrService)
    private dialog = inject(MatDialog)
    private storageService = inject(StorageService)
    private appwriteService = inject(AppwriteService)
    private reportService = inject(ReportService)
    private databaseService = inject(DatabaseService)
    private translocoService = inject(TranslocoService)
    private cdr = inject(ChangeDetectorRef)
    private syncService = inject(ComputationSyncService)

    readonly runs = signal<ComputationDisplayEntity[]>([])
    readonly scheduled = computed(() => this.runs().filter(run => isPendingStatus(run.status)))
    readonly completed = computed(() =>
        this.runs()
            .filter(run => run.status === 'SUCCESS')
            .sort((a, b) => compareDesc(new Date(a.request_ts?.valueOf() || 0), new Date(b.request_ts?.valueOf() || 0)))
    )
    activeComputation?: ComputationDisplayEntity
    private activationToken = 0
    archivedComputations: ComputationDatabaseEntity[] = []
    private _activeArtifact?: ArtifactEntity

    showArchived = false
    newRuns: string[] = []
    demoRuns: string[] = []
    importedRuns: string[] = []
    isReportVisible = false

    paginationInfo: { hasMore: boolean; loading: boolean; total?: number } = {
        hasMore: true,
        loading: false
    }

    archivedPaginationInfo: { hasMore: boolean; loading: boolean; total?: number } = {
        hasMore: true,
        loading: false
    }

    readonly Archive = Archive
    readonly ArchiveRestore = ArchiveRestore
    readonly CircleArrowLeft = CircleArrowLeft
    readonly CircleX = CircleX
    readonly Clock = Clock
    readonly Hash = Hash
    readonly ListTodo = ListTodo
    readonly Share2 = Share2
    readonly Check = Check
    readonly Loader = Loader
    readonly LoaderCircle = LoaderCircle
    readonly FileWarning = FileWarning
    readonly MessageSquareWarning = MessageSquareWarning
    readonly Clipboard = Clipboard
    readonly Trash2 = Trash2
    readonly Import = Import
    readonly X = X
    readonly EllipsisVertical = EllipsisVertical

    openMenuId: string | null = null

    @Input() pluginId: string = ''
    @Input() plugin?: Plugin
    @Input() hasDemoConfig: boolean = true
    demoConfig: DemoConfig | null = null
    pluginLanguage: SupportedLanguage = SupportedLanguage.EN

    @ViewChild('parametersDialog') parametersDialog!: TemplateRef<{
        params: ComputationParameters
    }>

    @ViewChild('artifactErrorsTooltip') artifactErrorsTooltip!: TemplateRef<{
        artifactErrors: ComputationDisplayEntity['artifact_errors']
    }>

    @ViewChild(ComputationComponent) computationComponent!: ComputationComponent

    get activeArtifact(): ArtifactEntity | undefined {
        return this._activeArtifact
    }

    user: Models.User<Models.Preferences> | null = null
    scheduledRunsSubscription: Subscription = new Subscription()
    userSubscription: Subscription
    private syncTransitionsSub?: Subscription
    private reportVisibilitySubscription: Subscription = new Subscription()
    private mapArtifactsSubscription?: Subscription

    constructor() {
        this.userSubscription = this.appwriteService._user.subscribe(user => {
            this.user = user
        })

        this.pluginId = this.route.snapshot.params['name']

        if (this.pluginService.computeState$) {
            this.pluginService.computeState$.subscribe(value => {
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
        this.hasDemoConfig = !!this.plugin?.demo_config
        this.demoConfig = this.plugin?.demo_config ?? null
        this.pluginLanguage = this.plugin?.language ?? SupportedLanguage.EN

        this.loadInitialPluginRuns()

        this.shareService.onComputationToImport().subscribe(computationId => {
            if (computationId) {
                this.importComputation(computationId)
            }
        })

        this.syncTransitionsSub = this.syncService.transitions$.subscribe(transition =>
            this.transitionRunStatus(transition.run, transition.newStatus, transition.message)
        )

        this.scheduledRunsSubscription = this.pluginService.getPluginRuns().subscribe(() => {
            this.refreshRunsFromStorage()
        })

        this.pluginService.syncTasks$.subscribe(() => {
            this.refreshRunsFromStorage()
            this.startPeriodicSync()
        })

        this.reportService.isVisible$.subscribe(isVisible => {
            this.isReportVisible = isVisible
        })

        this.artifactViewerService.isViewerVisible$.subscribe(isVisible => {
            if (!isVisible && this._activeArtifact) {
                this._activeArtifact = undefined
                this.mapArtifactManager.setActiveArtifactId(null)
            }
        })

        this.mapArtifactsSubscription = this.mapArtifactManager.activeMapArtifacts$.subscribe(layers => {
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

    private async loadRuns(isInitialLoad: boolean = true, state: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE'): Promise<void> {
        const isActive = state === 'ACTIVE'
        const paginationInfo = isActive ? this.paginationInfo : this.archivedPaginationInfo

        if (!isInitialLoad && (!paginationInfo.hasMore || paginationInfo.loading)) return

        try {
            // Set loading state
            if (isActive) this.paginationInfo = { hasMore: true, loading: true }
            else this.archivedPaginationInfo = { hasMore: true, loading: true }

            const result = await this.storageService.getPluginRunsPaginated(this.pluginId, isInitialLoad, state)

            // Update pagination state
            const newPaginationInfo = { hasMore: result.hasMore, loading: false, total: result.total }
            if (isActive) this.paginationInfo = newPaginationInfo
            else this.archivedPaginationInfo = newPaginationInfo

            // Handle results based on state
            if (isActive) {
                this.handleActiveRunsResult(result.documents, isInitialLoad)
            } else {
                if (isInitialLoad) this.archivedComputations = result.documents
                else this.archivedComputations = [...this.archivedComputations, ...result.documents]
            }
        } catch (error) {
            console.error(`Error loading ${isInitialLoad ? 'initial' : 'more'} ${state.toLowerCase()} runs:`, error)
        }
    }

    private handleActiveRunsResult(documents: ComputationDatabaseEntity[], isInitialLoad: boolean): void {
        this.upsertRuns(documents)
        this.updateNewRuns(documents)

        if (isInitialLoad) {
            if (this.runs().length === 0 && this.hasDemoConfig) {
                this.checkAndFetchDemoComputation()
            }

            this.startPeriodicSync()
            this.restoreActiveArtifact()
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
                    existing.state = entity.state ?? existing.state
                } else if (isPendingStatus(entity.status) || entity.status === 'SUCCESS') {
                    additions.push(mapDatabaseComputation(entity))
                }
            }

            return [...list, ...additions]
        })
    }

    private async loadInitialPluginRuns(): Promise<void> {
        await this.loadRuns(true, 'ACTIVE')
    }

    async loadMoreRuns(): Promise<void> {
        await this.loadRuns(false, 'ACTIVE')
    }

    toggleArchivedView(): void {
        this.showArchived = !this.showArchived
        if (this.showArchived) {
            this.runs.set([])
            this.loadRuns(true, 'ARCHIVED')
        } else {
            this.archivedComputations = []
            this.archivedPaginationInfo = { hasMore: true, loading: false }
            this.loadInitialPluginRuns()
        }
    }

    async loadMoreArchivedRuns(): Promise<void> {
        await this.loadRuns(false, 'ARCHIVED')
    }

    ngOnDestroy() {
        if (this.scheduledRunsSubscription) this.scheduledRunsSubscription.unsubscribe()
        if (this.syncTransitionsSub) {
            this.syncTransitionsSub.unsubscribe()
        }
        if (this.reportVisibilitySubscription) {
            this.reportVisibilitySubscription.unsubscribe()
        }
        if (this.mapArtifactsSubscription) {
            this.mapArtifactsSubscription.unsubscribe()
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
            return
        }

        computation.loading = !computation.hydrated

        try {
            computation = await this.ensureHydrated(computation)
        } catch {
            if (token === this.activationToken) {
                this.activeComputation = undefined
            }
            return
        } finally {
            computation.loading = false
        }

        if (token !== this.activationToken) return

        computation.keepInDOM = true
        setTimeout(() => (computation.isExpanded = true), 0)
        this.activeComputation = computation

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
        }
    }

    toggleActionsMenu(correlation_uuid: string, event: Event) {
        event.stopPropagation()
        this.openMenuId = this.openMenuId === correlation_uuid ? null : correlation_uuid
    }

    closeActionsMenu() {
        this.openMenuId = null
    }

    shareComputation(correlation_uuid: string, event: Event) {
        event.stopPropagation()
        this.closeActionsMenu()

        const shareLink = this.shareService.getShareUrl(correlation_uuid)

        navigator.clipboard.writeText(shareLink)
        this.toastr.info('Computation link copied to clipboard', '', {
            timeOut: 4000
        })
    }

    storeActiveArtifact(artifact: ArtifactEntity) {
        if (artifact) {
            this._activeArtifact = artifact
            this.mapArtifactManager.setActiveArtifactId(artifact)

            this.storageService.saveActiveArtifact({
                correlation_uuid: artifact.correlation_uuid,
                filename: artifact.filename
            })
        } else {
            console.error('Cannot persist active artifact: ', artifact)
        }
    }

    private async restoreActiveArtifact(): Promise<void> {
        const activeArtifactRef = this.storageService.getActiveArtifact()
        if (!activeArtifactRef) return

        const parentComputation = this.runs().find(x => x.correlation_uuid === activeArtifactRef.correlation_uuid)
        if (!parentComputation) return

        await this.toggleComputation(parentComputation)

        const hydratedComputation = this.activeComputation
        if (hydratedComputation?.correlation_uuid !== activeArtifactRef.correlation_uuid) return

        this._activeArtifact = hydratedComputation.artifacts.find(x => x.filename === activeArtifactRef.filename)
        if (this._activeArtifact) {
            const artifact = this._activeArtifact
            setTimeout(() => this.computationComponent?.viewArtifact(artifact), 0)
        }
    }

    viewParameters(computation: ComputationDisplayEntity, event?: Event) {
        event?.stopPropagation()
        this.closeActionsMenu()
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

    archiveComputation(correlation_uuid: string, event?: Event): void {
        event?.stopPropagation()
        this.closeActionsMenu()
        this.storageService.archiveComputation(correlation_uuid)
        this.removeComputationFromView(correlation_uuid)
    }

    deleteComputation(correlation_uuid: string, event?: Event): void {
        event?.stopPropagation()
        this.closeActionsMenu()

        const confirmed = confirm(this.translocoService.translate('computationsIndex.deleteConfirmation'))
        if (!confirmed) return

        this.storageService.deleteComputation(correlation_uuid)
        this.removeComputationFromView(correlation_uuid)
    }

    private removeComputationFromView(correlation_uuid: string): void {
        const isCurrentComputation =
            this.activeComputation && this.activeComputation.correlation_uuid === correlation_uuid

        this.runs.update(list => list.filter(run => run.correlation_uuid !== correlation_uuid))

        if (isCurrentComputation) {
            this.artifactViewerService.closeArtifactViewer()
            this.mapService.removeFocusedLayer()
            this.activeComputation = undefined
        }

        if (this.runs().length === 0 && this.paginationInfo.hasMore && !this.paginationInfo.loading) {
            this.loadRuns(false, 'ACTIVE')
        }
    }

    unarchiveComputation(correlation_uuid: string): void {
        this.storageService.unarchiveComputation(correlation_uuid)

        this.archivedComputations = this.archivedComputations.filter(comp => comp.correlation_uuid !== correlation_uuid)

        if (
            this.archivedComputations.length === 0 &&
            this.archivedPaginationInfo.hasMore &&
            !this.archivedPaginationInfo.loading
        ) {
            this.loadRuns(false, 'ARCHIVED')
        }
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
        if (this.runs().some(run => run.correlation_uuid === correlationUuid)) {
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

        this.pluginService.getComputationMetadata(correlationUuid).subscribe({
            next: (response: ComputationMetadata) => {
                const computation: ComputationDatabaseEntity = {
                    correlation_uuid: correlationUuid,
                    pluginId: response.plugin_info?.id,
                    request_ts: response.request_ts,
                    status: 'SUCCESS',
                    aoiName: response.aoi?.properties?.['name'] as string | undefined,
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

    private async checkAndFetchDemoComputation(): Promise<void> {
        try {
            const hasExistingDemo = await this.databaseService.hasDemoComputations(this.pluginId)
            if (!hasExistingDemo) {
                this.fetchDemoComputation()
            }
        } catch (error) {
            console.error('Error checking for existing demo computations:', error)
        }
    }

    fetchDemoComputation(): void {
        this.pluginService.computeDemo(this.pluginId).subscribe({
            next: data => {
                this.pluginService.getComputationRunState(data.correlation_uuid).subscribe({
                    next: stateInfo => {
                        if (stateInfo.state === 'SUCCESS') {
                            const compute: ComputationDatabaseEntity = {
                                correlation_uuid: data.correlation_uuid,
                                pluginId: this.pluginId,
                                request_ts: new Date(),
                                aoiName: this.demoConfig?.name || 'Demo',
                                status: stateInfo.state,
                                flags: ['DEMO']
                            }
                            this.pluginService
                                .storeNewComputes(compute)
                                .then(() => {
                                    this.demoRuns.push(data.correlation_uuid)
                                    this.upsertRuns([compute])
                                })
                                .catch(error => {
                                    console.error('Failed to store demo computation:', error)
                                })
                        } else {
                            const compute: ComputationDatabaseEntity = {
                                correlation_uuid: data.correlation_uuid,
                                pluginId: this.pluginId,
                                request_ts: new Date(),
                                aoiName: this.demoConfig?.name || 'Demo',
                                status: stateInfo.state,
                                flags: ['DEMO']
                            }
                            this.pluginService
                                .storeNewComputes(compute)
                                .then(() => {
                                    this.pluginService.triggerSyncTasks()
                                })
                                .catch(error => {
                                    console.error('Failed to store demo computation:', error)
                                })
                        }
                    }
                })
            },
            error: () => {
                console.warn('Could not fetch a demo computation for', this.pluginId)
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

    getLanguageMismatchTooltip(computation: Pick<ComputationDisplayEntity, 'language' | 'hydrated'>): string | null {
        if (!computation.hydrated) {
            return null
        }

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

    // trackBy helpers to reduce DOM churn in lists
    trackByScheduled(_index: number, run: ComputationDisplayEntity): string {
        return run.correlation_uuid
    }

    trackByComputation(_index: number, comp: ComputationDisplayEntity): string {
        return comp.correlation_uuid
    }

    trackByArchived(_index: number, run: ComputationDatabaseEntity): string {
        return run.correlation_uuid
    }
}
