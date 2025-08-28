import { animate, state, style, transition, trigger } from '@angular/animations'
import { CommonModule, NgClass, NgIf } from '@angular/common'
import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { ActivatedRoute } from '@angular/router'
import { AppwriteService } from '@app/auth/appwrite.service'
import { DatabaseService } from '@app/database.service'
import { StorageService } from '@app/storage.service'
import { derivePluginNameFromId } from '@app/utils/string.utils'
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
    FileWarning,
    Hash,
    ListTodo,
    Loader,
    LoaderCircle,
    LucideAngularModule,
    Share2,
    Trash2
} from 'lucide-angular'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, Subscription, take, timer } from 'rxjs'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactEntity } from '../artifact/artifact.interface'
import { ComputationComponent } from '../computation/computation.component'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { ReportService } from '../report/report.service'
import { ShareService } from '../share/share.service'
import { FilterByCriteriaPipe } from './computation-filters.pipe'
import {
    ComputationDatabaseEntity,
    ComputationDisplayEntity,
    ComputationMetadata,
    ComputationParameters
} from './computation.interface'

const ARTIFACT_ICON_MAP: { [index: string]: string } = {
    IMAGE: 'image',
    MARKDOWN: 'description',
    CHART: 'data_usage',
    CHART_PLOTLY: 'bar_chart',
    TABLE: 'table_chart',
    MAP_LAYER_GEOJSON: 'layers',
    MAP_LAYER_GEOTIFF: 'map'
}

const ARTIFACT_ORDER_MAP: { [index: string]: number } = {
    description: 1,
    image: 2,
    layers: 3,
    map: 4,
    data_usage: 5,
    bar_chart: 6,
    table_chart: 7
}

@Component({
    selector: 'app-computations-index',
    imports: [
        MatIconModule,
        TippyDirective,
        NgIf,
        NgClass,
        CommonModule,
        NgScrollbarModule,
        FilterByCriteriaPipe,
        LucideAngularModule,
        ComputationComponent
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
    styleUrl: './computations-index.component.scss'
})
export class ComputationsIndexComponent implements OnInit, OnDestroy {
    computations: ComputationDisplayEntity[] = []
    dataChange = new BehaviorSubject<ComputationDisplayEntity[]>([])
    currentRuns: ComputationDatabaseEntity[] = []
    scheduledRuns: ComputationDatabaseEntity[] = []
    activeComputation?: ComputationDisplayEntity
    archivedComputations: ComputationDatabaseEntity[] = []
    private _activeArtifact?: ArtifactEntity

    showArchived = false
    newRuns: string[] = []
    demoRuns: string[] = []
    currentLocale = navigator.language
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
    readonly Clipboard = Clipboard
    readonly Trash2 = Trash2

    @Input() pluginId: string = ''
    @Input() demoConfig: boolean = true

    @ViewChild('parametersDialog') parametersDialog!: TemplateRef<{
        params: ComputationParameters
    }>

    @ViewChild('artifactErrorsTooltip') artifactErrorsTooltip!: TemplateRef<{
        artifactErrors: ComputationDisplayEntity['artifact_errors']
    }>

    @ViewChild(ComputationComponent) computationComponent!: ComputationComponent

    get activeArtifact(): ArtifactEntity | undefined {
        return this.artifactViewerService.isViewerVisible ? this._activeArtifact : undefined
    }

    user: Models.User<Models.Preferences> | null = null
    scheduledRunsSubscription: Subscription = new Subscription()
    userSubscription: Subscription
    private syncSubscription?: Subscription
    private reportVisibilitySubscription: Subscription = new Subscription()

    private readonly INITIAL_INTERVAL = 2500
    private readonly MAX_INTERVAL = 1800000

    constructor(
        private pluginService: PluginService,
        public artifactViewerService: ArtifactViewerService,
        private mapService: MapService,
        private route: ActivatedRoute,
        private shareService: ShareService,
        private toastr: ToastrService,
        private dialog: MatDialog,
        private storageService: StorageService,
        private appwriteService: AppwriteService,
        private reportService: ReportService,
        private databaseService: DatabaseService
    ) {
        this.userSubscription = this.appwriteService._user.subscribe(user => {
            this.user = user
        })

        this.pluginId = this.route.snapshot.params['name']
        this.pluginService
            .getPluginDetails(this.pluginId)
            .pipe(take(1))
            .subscribe(({ demo_config }) => {
                this.demoConfig = !!demo_config
            })

        if (this.pluginService.computeState$) {
            this.pluginService.computeState$.subscribe(value => {
                if (value === 'compute-ready') {
                    this.collapseComputation()
                }
            })
        }
    }

    formatTimestamp(timestamp: Date) {
        return format(timestamp, 'MMM d, yyyy h:mm a')
    }

    formatUUID(correlation_uuid: string): string {
        return correlation_uuid.substring(0, 8)
    }

    ngOnInit(): void {
        this.loadInitialPluginRuns()

        this.shareService.onComputationToImport().subscribe(computationId => {
            if (computationId) {
                this.importComputation(computationId)
            }
        })

        this.dataChange.subscribe(data => {
            if (data.length > 0) {
                this.computations = data
                this.activateArtifact()
            }
        })

        this.scheduledRunsSubscription = this.pluginService.getPluginRuns().subscribe(() => {
            this.refreshCurrentAndScheduledRuns()
        })

        this.pluginService.syncTasks$.subscribe(() => {
            this.refreshCurrentAndScheduledRuns()
            this.startPeriodicSync()
        })

        this.reportService.isVisible$.subscribe(isVisible => {
            this.isReportVisible = isVisible
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
        const filteredRuns = documents.filter(run => ['PENDING', 'STARTED', 'SUCCESS'].includes(run.status))

        if (isInitialLoad) {
            this.currentRuns = filteredRuns
            this.scheduledRuns = documents.filter(run => ['PENDING', 'STARTED'].includes(run.status))

            this.updateNewRuns(documents)

            if (this.currentRuns.length === 0 && this.demoConfig) {
                this.checkAndFetchDemoComputation()
            }

            this.initializeSuccessfulRuns()
            this.startPeriodicSync()
        } else {
            this.currentRuns = [...this.currentRuns, ...filteredRuns]

            this.updateNewRuns(documents)

            this.initializeSuccessfulRuns(filteredRuns)
        }
    }

    private updateNewRuns(documents: ComputationDatabaseEntity[]): void {
        const newRunsFromData = documents.filter(run => run.flags?.includes('NEW')).map(run => run.correlation_uuid)
        this.newRuns = [...new Set([...this.newRuns, ...newRunsFromData])]
    }

    private refreshCurrentAndScheduledRuns(): void {
        this.currentRuns = this.storageService
            .getComputesByStatus(['PENDING', 'STARTED', 'SUCCESS'])
            .filter(run => run.pluginId === this.pluginId)
        this.scheduledRuns = this.storageService
            .getComputesByStatus(['PENDING', 'STARTED'])
            .filter(run => run.pluginId === this.pluginId)
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
            this.currentRuns = []
            this.computations = []
            this.scheduledRuns = []
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
        if (this.syncSubscription) {
            this.syncSubscription.unsubscribe()
        }
        if (this.reportVisibilitySubscription) {
            this.reportVisibilitySubscription.unsubscribe()
        }
    }

    initializeSuccessfulRuns(runs?: ComputationDatabaseEntity[]) {
        const runsToProcess = runs || this.currentRuns
        runsToProcess
            .filter(run => run.status === 'SUCCESS')
            .forEach(run => {
                this.fetchAndProcessComputations(run)
            })
    }

    getAppwriteUrl(path: string): string {
        return this.appwriteService.getAppwriteUrl(path)
    }

    getRedirectUrl(): string {
        return this.appwriteService.getRedirectUrl()
    }

    syncRuns() {
        this.currentRuns
            .filter(run => run.status === 'PENDING' || run.status === 'STARTED')
            .forEach(run => {
                this.pluginService.getComputationRunState(run.correlation_uuid).subscribe({
                    next: stateInfo => {
                        if (stateInfo.state === 'STARTED') {
                            this.pluginService.updateRunStatus(run.correlation_uuid, 'STARTED')
                        }
                        if (stateInfo.state === 'SUCCESS') {
                            this.pluginService.updateRunStatus(run.correlation_uuid, 'SUCCESS')
                            this.fetchAndProcessComputations(run)
                            this.storageService.markAsNew(run.correlation_uuid)
                            if (!this.newRuns.includes(run.correlation_uuid)) {
                                this.newRuns.push(run.correlation_uuid)
                            }
                            this.syncSubscription?.unsubscribe()
                            this.toastr.success(
                                `<strong>${derivePluginNameFromId(run.pluginId || '')}</strong> computation for <strong>${run.aoiName}</strong> (ID: #${this.formatUUID(run.correlation_uuid)}) has completed successfully.`,
                                '',
                                {
                                    timeOut: 7000,
                                    enableHtml: true
                                }
                            )
                        } else if (stateInfo.state === 'FAILURE') {
                            this.pluginService.updateRunStatus(run.correlation_uuid, 'FAILURE')
                            this.syncSubscription?.unsubscribe()
                            this.toastr.error(
                                `Error while computing <strong>${derivePluginNameFromId(run.pluginId || '')}</strong> for <strong>${run.aoiName}</strong> (ID: #${this.formatUUID(run.correlation_uuid)})${stateInfo.message ? ' — ' + stateInfo.message : ''}.`,
                                '',
                                {
                                    disableTimeOut: true,
                                    enableHtml: true
                                }
                            )
                        }
                    },
                    error: error => {
                        console.error('Error checking state for run:', run.correlation_uuid, error)
                    }
                })
            })
    }

    fetchAndProcessComputations(run: ComputationDatabaseEntity) {
        this.pluginService.getComputationMetadata(run.correlation_uuid).subscribe({
            next: (response: ComputationMetadata) => {
                const artifacts = response.artifacts
                if (!artifacts) return
                const computation: ComputationDisplayEntity = {
                    correlation_uuid: run.correlation_uuid,
                    artifacts: [],
                    status: response.status,
                    timestamp: response.timestamp,
                    aoiName: response.aoi?.get('name'),
                    geometry: response.aoi,
                    pluginId: response.plugin_info?.plugin_id,
                    params: response.params,
                    artifact_errors: response.artifact_errors
                }

                if (Array.isArray(artifacts) && artifacts.length > 0) {
                    computation.artifacts = artifacts
                        .map<ArtifactEntity>(x => {
                            return {
                                name: x.name,
                                modality: x.modality,
                                primary: x.primary,
                                file_path: x.file_path,
                                summary: x.summary,
                                description: x.description,
                                correlation_uuid: x.correlation_uuid,
                                store_id: x.store_id,
                                attachments: x.attachments,
                                icon: ARTIFACT_ICON_MAP[x.modality]
                            }
                        })
                        .sort((a, b) => {
                            if (a.icon == b.icon) {
                                return (a.name || '').localeCompare(b.name || '')
                            } else if (
                                a.icon &&
                                b.icon &&
                                a.icon in ARTIFACT_ORDER_MAP &&
                                b.icon in ARTIFACT_ORDER_MAP
                            ) {
                                return ARTIFACT_ORDER_MAP[a.icon] - ARTIFACT_ORDER_MAP[b.icon]
                            }
                            return 0
                        })
                }
                this.updateComputation(run.correlation_uuid, computation)
            },
            error: () => {
                console.error('Error fetching computations for:', run.correlation_uuid)
            }
        })
    }

    updateComputation(correlation_uuid: string, computation: ComputationDisplayEntity) {
        if (computation.status === 'PENDING' || computation.status === 'STARTED' || computation.status === 'SUCCESS') {
            this.computations = this.computations.filter(x => x.correlation_uuid != correlation_uuid)
            this.computations.push(computation)
            this.computations.sort((a, b) => {
                return compareDesc(new Date(a.timestamp?.valueOf() || 0), new Date(b.timestamp?.valueOf() || 0))
            })
            this.dataChange.next(this.computations)
        }
    }

    removeNewRunMark(correlation_uuid: string) {
        this.storageService.markAsViewed(correlation_uuid)
        this.newRuns = this.newRuns.filter(id => id !== correlation_uuid)
    }

    toggleComputation(computation: ComputationDisplayEntity) {
        if (this.pluginService.computeState$) {
            this.pluginService.setComputeState('inactive')
        }
        this.pluginService.collapsePluginCatalog()
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
        } else {
            computation.keepInDOM = true
            setTimeout(() => (computation.isExpanded = true), 0)
            this.activeComputation = computation

            if (computation && computation.geometry) {
                const extent = this.mapService.highlightAoI(computation.geometry)

                if (extent) {
                    this.mapService.flyToExtent(extent)
                }
            }

            if (this.newRuns.includes(computation.correlation_uuid)) {
                this.removeNewRunMark(computation.correlation_uuid)
            }
        }
    }

    collapseComputation() {
        const previousActiveComputation = this.activeComputation

        if (previousActiveComputation) {
            previousActiveComputation.isExpanded = false
            setTimeout(() => (previousActiveComputation.keepInDOM = false), 300)
            this.artifactViewerService.closeArtifactViewer()
            this.mapService.removeFocusedLayer()
            this.activeComputation = undefined
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

    storeActiveArtifact(artifact: ArtifactEntity) {
        if (artifact) {
            this._activeArtifact = artifact

            this.storageService.saveActiveArtifact({
                correlation_uuid: artifact.correlation_uuid,
                store_id: artifact.store_id
            })
        } else {
            console.error('Cannot persist active artifact: ', artifact)
        }
    }

    activateArtifact() {
        if (this.computations.length == this.currentRuns.length) {
            const activeArtifactRef = this.storageService.getActiveArtifact()
            if (activeArtifactRef) {
                const parentComputation = this.computations.find(
                    x => x.correlation_uuid === activeArtifactRef.correlation_uuid
                )
                if (parentComputation) {
                    this.toggleComputation(parentComputation)
                    this._activeArtifact = parentComputation.artifacts.find(
                        x => x.store_id === activeArtifactRef.store_id
                    )
                    if (this._activeArtifact) {
                        this.computationComponent.renderArtifact(this._activeArtifact)
                    }
                }
            }
        }
    }

    viewParameters(computation: ComputationDisplayEntity, event?: Event) {
        event?.stopPropagation()
        this.dialog.open(this.parametersDialog, {
            data: { parameters: JSON.stringify(computation.params) },
            autoFocus: false
        })
    }

    closeDialog() {
        this.dialog.closeAll()
    }

    archiveComputation(correlation_uuid: string, event?: Event): void {
        event?.stopPropagation()
        this.storageService.archiveComputation(correlation_uuid)
        this.removeComputationFromView(correlation_uuid)
    }

    deleteComputation(correlation_uuid: string, event?: Event): void {
        event?.stopPropagation()

        const confirmed = confirm('Are you sure you want to delete this computation? This action cannot be undone.')
        if (!confirmed) return

        this.storageService.deleteComputation(correlation_uuid)
        this.removeComputationFromView(correlation_uuid)
    }

    private removeComputationFromView(correlation_uuid: string): void {
        const isCurrentComputation =
            this.activeComputation && this.activeComputation.correlation_uuid === correlation_uuid

        this.currentRuns = this.currentRuns.filter(run => run.correlation_uuid !== correlation_uuid)
        this.computations = this.computations.filter(comp => comp.correlation_uuid !== correlation_uuid)
        this.dataChange.next(this.computations)

        if (isCurrentComputation) {
            this.artifactViewerService.closeArtifactViewer()
            this.mapService.removeFocusedLayer()
        }

        if (this.currentRuns.length === 0 && this.paginationInfo.hasMore && !this.paginationInfo.loading) {
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
        let retryCount = 0

        const checkAndScheduleNext = () => {
            const hasPendingRuns = this.currentRuns.some(run => run.status === 'PENDING' || run.status === 'STARTED')
            const nextInterval = Math.min(this.INITIAL_INTERVAL * Math.pow(2, retryCount), this.MAX_INTERVAL)

            if (hasPendingRuns) {
                this.syncRuns()
                retryCount++
                this.syncSubscription = timer(nextInterval).subscribe(() => checkAndScheduleNext())
            }
        }

        checkAndScheduleNext()
    }

    getParameterEntries(params: string | object): [string, string][] {
        const obj = typeof params === 'string' ? JSON.parse(params) : params
        return Object.entries(obj)
    }

    formatParameterName(name: string): string {
        return name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    importComputation(correlationUuid: string): void {
        if (this.currentRuns.some(run => run.correlation_uuid === correlationUuid)) {
            this.toastr.warning('Computation ID #' + this.formatUUID(correlationUuid) + ' is already present', '', {
                timeOut: 4000
            })
            return
        }

        this.pluginService.getComputationMetadata(correlationUuid).subscribe({
            next: (response: ComputationMetadata) => {
                const computation: ComputationDatabaseEntity = {
                    correlation_uuid: correlationUuid,
                    pluginId: response.plugin_info?.plugin_id,
                    timestamp: response.timestamp,
                    status: 'SUCCESS',
                    aoiName: response.aoi?.get('name')
                }

                this.pluginService.storeNewComputes(computation)
                this.currentRuns.push(computation)
                this.fetchAndProcessComputations(computation)
                this.toastr.success('Computation ID #' + this.formatUUID(correlationUuid) + ' imported', '', {
                    timeOut: 4000
                })
            },
            error: error => {
                console.error('Error importing computation:', error)
                this.toastr.error('Error importing computation', '', {
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
                                timestamp: new Date(),
                                aoiName: 'Demo',
                                status: stateInfo.state,
                                flags: ['DEMO']
                            }
                            this.pluginService.storeNewComputes(compute)
                            this.demoRuns.push(data.correlation_uuid)
                            this.fetchAndProcessComputations(compute)
                        } else {
                            const compute: ComputationDatabaseEntity = {
                                correlation_uuid: data.correlation_uuid,
                                pluginId: this.pluginId,
                                timestamp: new Date(),
                                aoiName: 'Demo',
                                status: stateInfo.state,
                                flags: ['DEMO']
                            }
                            this.pluginService.storeNewComputes(compute)
                            this.pluginService.triggerSyncTasks()
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
}
