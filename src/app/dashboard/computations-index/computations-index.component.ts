import { animate, state, style, transition, trigger } from '@angular/animations'
import { CommonModule, NgClass, NgIf } from '@angular/common'
import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute } from '@angular/router'
import { AppwriteService } from '@app/auth/appwrite.service'
import { StorageService } from '@app/storage.service'
import { derivePluginNameFromId } from '@app/utils/string.utils'
import { TippyDirective } from '@ngneat/helipopper'
import { Models } from 'appwrite'
import {
    Archive,
    ArchiveRestore,
    CircleArrowLeft,
    CircleX,
    Clock,
    Hash,
    ListTodo,
    LucideAngularModule,
    Share2
} from 'lucide-angular'
import moment from 'moment/moment'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { BehaviorSubject, Subscription, take, timer } from 'rxjs'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactEntity } from '../artifact/artifact.interface'
import { ComputationComponent } from '../computation/computation.component'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
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
    activeArtifact?: ArtifactEntity
    archivedComputations: ComputationDatabaseEntity[] = []
    showArchived = false
    newRuns: string[] = []
    demoRuns: string[] = []
    currentLocale = navigator.language

    readonly Archive = Archive
    readonly ArchiveRestore = ArchiveRestore
    readonly CircleArrowLeft = CircleArrowLeft
    readonly CircleX = CircleX
    readonly Clock = Clock
    readonly Hash = Hash
    readonly ListTodo = ListTodo
    readonly Share2 = Share2

    @Input() pluginId: string = ''
    @Input() demoConfig: boolean = true

    @ViewChild('parametersDialog') parametersDialog!: TemplateRef<{
        params: ComputationParameters
    }>

    @ViewChild(ComputationComponent) computationComponent!: ComputationComponent

    user: Models.User<Models.Preferences> | null = null
    scheduledRunsSubscription: Subscription = new Subscription()
    userSubscription: Subscription
    private syncSubscription?: Subscription

    private readonly INITIAL_INTERVAL = 2500
    private readonly MAX_INTERVAL = 1800000

    constructor(
        private pluginService: PluginService,
        public artifactViewerService: ArtifactViewerService,
        private mapService: MapService,
        private route: ActivatedRoute,
        private shareService: ShareService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private storageService: StorageService,
        private appwriteService: AppwriteService
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

        this.newRuns = this.storageService.getNewRuns()
        this.demoRuns = this.storageService.getDemoRuns(this.pluginId)
    }

    formatTimestamp(timestamp: Date) {
        return moment.utc(timestamp).local().locale(this.currentLocale).format('lll')
    }

    formatUUID(correlation_uuid: string): string {
        return correlation_uuid.substring(0, 8)
    }

    ngOnInit(): void {
        if (this.demoRuns.length == 0 && this.demoConfig) {
            this.fetchDemoComputation()
        }

        this.currentRuns = this.storageService.getComputesByStatus(['PENDING', 'STARTED', 'SUCCESS'])
        this.archivedComputations = this.storageService.getArchivedRuns()
        this.startPeriodicSync()

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

        this.initializeSuccessfulRuns()

        this.scheduledRuns = this.storageService.getComputesByStatus(['PENDING', 'STARTED'])
        this.scheduledRunsSubscription = this.pluginService.getPluginRuns().subscribe(() => {
            this.currentRuns = this.storageService.getComputesByStatus(['PENDING', 'STARTED', 'SUCCESS'])
            this.scheduledRuns = this.storageService.getComputesByStatus(['PENDING', 'STARTED'])
        })

        this.pluginService.syncTasks$.subscribe(() => {
            this.currentRuns = this.storageService.getComputesByStatus(['PENDING', 'STARTED', 'SUCCESS'])
            this.startPeriodicSync()
        })
    }

    toggleArchivedView(): void {
        this.showArchived = !this.showArchived
        if (this.showArchived) {
            this.archivedComputations = this.storageService.getArchivedRuns()
        }
    }

    ngOnDestroy() {
        if (this.scheduledRunsSubscription) this.scheduledRunsSubscription.unsubscribe()
        if (this.syncSubscription) {
            this.syncSubscription.unsubscribe()
        }
    }

    initializeSuccessfulRuns() {
        this.currentRuns
            .filter(currentRun => currentRun.status === 'SUCCESS')
            .forEach(currentRun => {
                this.fetchAndProcessComputations(currentRun)
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
                this.pluginService.getComputationState(run.correlation_uuid).subscribe({
                    next: stateInfo => {
                        if (stateInfo.state === 'SUCCESS') {
                            this.storageService.markAsNew(run.correlation_uuid)
                            this.newRuns = this.storageService.getNewRuns()
                            this.fetchAndProcessComputations(run)
                            if (this.syncSubscription) {
                                this.syncSubscription.unsubscribe()
                            }
                        } else if (stateInfo.state === 'FAILURE') {
                            this.pluginService.updateRunStatus(run.correlation_uuid, 'FAILURE')
                            this.snackBar.open(
                                `Error while computing plugin${stateInfo.message ? ': ' + stateInfo.message : ''}.`,
                                'Close',
                                {
                                    verticalPosition: 'bottom',
                                    horizontalPosition: 'center',
                                    panelClass: ['error-snackbar']
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
                const computations = response.artifacts
                if (!computations) return
                const computation: ComputationDisplayEntity = {
                    correlation_uuid: run.correlation_uuid,
                    artifacts: [],
                    status: response.status || 'PENDING',
                    timestamp: response.timestamp,
                    aoiName: response.aoi?.get('name'),
                    geometry: response.aoi,
                    pluginId: response.plugin_info?.plugin_id,
                    params: response.params
                }

                if (Array.isArray(computations) && computations.length > 0) {
                    computation.artifacts = computations
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
                    this.pluginService.updateRunStatus(run.correlation_uuid, 'SUCCESS')
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
                return moment(a.timestamp?.valueOf()) < moment(b.timestamp?.valueOf()) ? 1 : -1
            })
            this.dataChange.next(this.computations)
        }
    }

    removeNewRunMark(correlation_uuid: string) {
        this.storageService.markAsViewed(correlation_uuid)
        this.newRuns = this.storageService.getNewRuns()
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
            this.activeArtifact = undefined
        } else {
            computation.keepInDOM = true
            setTimeout(() => (computation.isExpanded = true), 0)
            this.activeComputation = computation

            if (computation && computation.geometry) {
                const extent = this.mapService.highlightAoI(computation.geometry)

                if (extent && this.mapService.map) {
                    this.mapService.map.getView().fit(extent, {
                        padding: this.mapService.calculateMapPadding()
                    })
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
        this.snackBar.open('Computation link copied to clipboard', 'Close', {
            duration: 4000,
            verticalPosition: 'bottom',
            horizontalPosition: 'center',
            panelClass: ['success-snackbar']
        })
    }

    storeActiveArtifact(artifact: ArtifactEntity) {
        if (artifact) {
            this.activeArtifact = artifact

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
                    this.activeArtifact = parentComputation.artifacts.find(
                        x => x.store_id === activeArtifactRef.store_id
                    )
                    if (this.activeArtifact) {
                        this.computationComponent.renderArtifact(this.activeArtifact)
                    }
                }
            }
        }
    }

    viewParameters(computation: ComputationDisplayEntity) {
        this.dialog.open(this.parametersDialog, {
            data: { parameters: JSON.stringify(computation.params) },
            autoFocus: false
        })
    }

    closeDialog() {
        this.dialog.closeAll()
    }

    archiveComputation(correlation_uuid: string): void {
        const isCurrentComputation =
            this.activeComputation && this.activeComputation.correlation_uuid === correlation_uuid

        this.storageService.archiveComputation(correlation_uuid)
        this.currentRuns = this.storageService.getComputesByStatus(['PENDING', 'STARTED', 'SUCCESS'])
        this.archivedComputations = this.storageService.getArchivedRuns()
        this.refreshDataSource()

        if (isCurrentComputation) {
            this.artifactViewerService.closeArtifactViewer()
        }
    }

    unarchiveComputation(correlation_uuid: string): void {
        this.storageService.unarchiveComputation(correlation_uuid)
        this.currentRuns = this.storageService.getComputesByStatus(['PENDING', 'STARTED', 'SUCCESS'])
        this.archivedComputations = this.storageService.getArchivedRuns()

        const computationToFetch = this.currentRuns.find(run => run.correlation_uuid === correlation_uuid)
        if (computationToFetch) {
            this.fetchAndProcessComputations(computationToFetch)
        }
    }

    private refreshDataSource() {
        this.computations = this.computations.filter(computation =>
            this.currentRuns.some(run => run.correlation_uuid === computation.correlation_uuid)
        )
        this.dataChange.next(this.computations)
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
            this.snackBar.open('Computation ID #' + this.formatUUID(correlationUuid) + ' is already present', 'Close', {
                duration: 4000,
                verticalPosition: 'bottom',
                horizontalPosition: 'center',
                panelClass: ['error-snackbar']
            })
            return
        }

        this.pluginService.getComputationMetadata(correlationUuid).subscribe({
            next: (response: ComputationMetadata) => {
                const computation = {
                    correlation_uuid: correlationUuid,
                    pluginId: response.plugin_info?.plugin_id,
                    pluginName: derivePluginNameFromId(response.plugin_info.plugin_id),
                    timestamp: response.timestamp,
                    status: 'SUCCESS',
                    aoiName: response.aoi?.get('name')
                }

                this.currentRuns.push(computation as ComputationDisplayEntity)
                this.pluginService.refreshComputesInLS(this.currentRuns)
                this.fetchAndProcessComputations(computation as ComputationDisplayEntity)
                this.snackBar.open('Computation ID #' + this.formatUUID(correlationUuid) + ' imported', 'Close', {
                    duration: 4000,
                    verticalPosition: 'bottom',
                    horizontalPosition: 'center',
                    panelClass: ['success-snackbar']
                })
            },
            error: error => {
                console.error('Error importing computation:', error)
                this.snackBar.open('Error importing computation', 'Close', {
                    duration: 4000,
                    verticalPosition: 'bottom',
                    horizontalPosition: 'center',
                    panelClass: ['error-snackbar']
                })
            }
        })
    }

    fetchDemoComputation(): void {
        this.pluginService.computeDemo(this.pluginId).subscribe({
            next: data => {
                this.pluginService.getComputationState(data.correlation_uuid).subscribe({
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
}
