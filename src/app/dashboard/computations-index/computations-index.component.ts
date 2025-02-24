import { animate, state, style, transition, trigger } from '@angular/animations'
import { CommonModule, NgClass, NgIf } from '@angular/common'
import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute } from '@angular/router'
import { TippyDirective } from '@ngneat/helipopper'
import {
    Archive,
    ArchiveRestore,
    CircleArrowLeft,
    CircleX,
    Clock,
    Hash,
    ListTodo,
    LucideAngularModule
} from 'lucide-angular'
import moment from 'moment/moment'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { BehaviorSubject, Subscription, timer } from 'rxjs'
import { ActiveArtifactRef, ArtifactEntity } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationComponent } from '../computation/computation.component'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { FilterByCriteriaPipe } from './computation-filters.pipe'
import { ComputationEntity, ComputationMetadata, ComputationParameters } from './computation.interface'

const ARTIFACT_ICON_MAP: { [index: string]: string } = {
    IMAGE: 'image',
    MARKDOWN: 'description',
    CHART: 'bar_chart',
    TABLE: 'table_chart',
    MAP_LAYER_GEOJSON: 'layers',
    MAP_LAYER_GEOTIFF: 'map'
}

const ARTIFACT_ORDER_MAP: { [index: string]: number } = {
    description: 1,
    image: 2,
    layers: 3,
    map: 4,
    bar_chart: 5,
    table_chart: 6
}

@Component({
    selector: 'app-computations-index',
    standalone: true,
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
    computations: ComputationEntity[] = []
    dataChange = new BehaviorSubject<ComputationEntity[]>([])
    currentRuns: ComputationEntity[] = []
    scheduledRuns: ComputationEntity[] = []
    activeComputation?: ComputationEntity
    activeArtifact?: ArtifactEntity
    archivedComputations: ComputationEntity[] = []
    showArchived = false
    newRuns: string[] = []
    currentLocale = navigator.language

    readonly Archive = Archive
    readonly ArchiveRestore = ArchiveRestore
    readonly CircleArrowLeft = CircleArrowLeft
    readonly CircleX = CircleX
    readonly Clock = Clock
    readonly Hash = Hash
    readonly ListTodo = ListTodo

    @Input() pluginId: string = ''

    @ViewChild('parametersDialog') parametersDialog!: TemplateRef<{
        params: ComputationParameters
    }>

    @ViewChild(ComputationComponent) computationComponent!: ComputationComponent

    scheduledRunsSubscription: Subscription = new Subscription()
    private syncSubscription?: Subscription
    private readonly INITIAL_INTERVAL = 2500
    private readonly MAX_INTERVAL = 1800000

    constructor(
        private pluginService: PluginService,
        public artifactService: ArtifactService,
        private mapService: MapService,
        private route: ActivatedRoute,
        private snackBar: MatSnackBar,
        private dialog: MatDialog
    ) {
        if (this.pluginService.computeState$) {
            this.pluginService.computeState$.subscribe(value => {
                if (value === 'compute-ready') {
                    this.collapseComputation()
                }
            })
        }

        const storedNewRuns = localStorage.getItem('new_runs')
        if (storedNewRuns) {
            this.newRuns = JSON.parse(storedNewRuns)
        }
    }

    formatTimestamp(timestamp: Date) {
        return moment(timestamp).locale(this.currentLocale).format('lll')
    }

    formatUUID(correlation_uuid: string): string {
        return correlation_uuid.substring(0, 8)
    }

    ngOnInit(): void {
        this.pluginId = this.route.snapshot.params['name']

        this.currentRuns = this.pluginService.getComputesFromLS(['PENDING', 'STARTED', 'SUCCESS'])
        this.fetchArchivedComputations()
        this.startPeriodicSync()

        this.dataChange.subscribe(data => {
            if (data.length > 0) {
                this.computations = data
                this.activateArtifact()
            }
        })

        this.initializeSuccessfulRuns()

        if (this.artifactService.closeArtifactEvent) {
            this.artifactService.closeArtifactEvent.subscribe(() => this.closeArtifactEvent())
        }

        this.scheduledRuns = this.pluginService.getComputesFromLS(['PENDING', 'STARTED'])
        this.scheduledRunsSubscription = this.pluginService.getPluginRuns().subscribe(() => {
            this.currentRuns = this.pluginService.getComputesFromLS(['PENDING', 'STARTED', 'SUCCESS'])
            this.scheduledRuns = this.pluginService.getComputesFromLS(['PENDING', 'STARTED'])
        })

        this.pluginService.syncTasks$.subscribe(() => {
            this.currentRuns = this.pluginService.getComputesFromLS(['PENDING', 'STARTED', 'SUCCESS'])
            this.startPeriodicSync()
        })
    }

    toggleArchivedView(): void {
        this.showArchived = !this.showArchived
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

        if (this.currentRuns.filter(run => run.pluginId === this.pluginId).length === 0) {
            this.pluginService.setComputeState('compute-ready')
        } else {
            this.pluginService.setComputeState('inactive')
        }
    }

    fetchArchivedComputations() {
        const archivedItems = localStorage.getItem('archive_runs')
        if (archivedItems) {
            this.archivedComputations = JSON.parse(archivedItems).filter(
                (computation: ComputationEntity) =>
                    computation.status === 'PENDING' ||
                    computation.status === 'STARTED' ||
                    computation.status === 'SUCCESS'
            )
        }
    }

    syncRuns() {
        this.currentRuns
            .filter(run => run.status === 'PENDING' || run.status === 'STARTED')
            .forEach(run => {
                this.pluginService.getComputationState(run.correlation_uuid).subscribe({
                    next: status => {
                        if (status === 'SUCCESS') {
                            this.newRuns.push(run.correlation_uuid)
                            this.updateNewRunsStorage()
                            this.fetchAndProcessComputations(run)
                            if (this.syncSubscription) {
                                this.syncSubscription.unsubscribe()
                            }
                        } else if (status === 'FAILURE') {
                            this.pluginService.updateRunStatus(run.correlation_uuid, 'FAILURE')
                            this.snackBar.open('Error while computing plugin, please try again.', 'Close', {
                                verticalPosition: 'bottom',
                                horizontalPosition: 'center',
                                panelClass: ['error-snackbar']
                            })
                        }
                    },
                    error: error => {
                        console.error('Error checking state for run:', run.correlation_uuid, error)
                    }
                })
            })
    }

    fetchAndProcessComputations(run: ComputationEntity) {
        this.pluginService.getComputationMetadata(run.correlation_uuid).subscribe({
            next: (response: ComputationMetadata) => {
                const computations = response.artifacts
                if (!computations) return
                const computation: ComputationEntity = {
                    correlation_uuid: run.correlation_uuid,
                    artifacts: [],
                    status: run.status || 'PENDING',
                    timestamp: run.timestamp,
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

    updateComputation(correlation_uuid: string, computation: ComputationEntity) {
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
        this.newRuns = this.newRuns.filter(uuid => uuid !== correlation_uuid)
        this.updateNewRunsStorage()
    }

    updateNewRunsStorage() {
        localStorage.setItem('new_runs', JSON.stringify(this.newRuns))
    }

    toggleComputation(computation: ComputationEntity) {
        if (this.pluginService.computeState$) {
            this.pluginService.setComputeState('inactive')
        }
        this.pluginService.collapsePluginCatalog()
        const previousActiveComputation = this.activeComputation

        if (previousActiveComputation) {
            previousActiveComputation.isExpanded = false
            setTimeout(() => (previousActiveComputation.keepInDOM = false), 300)
            this.artifactService.closeArtifact()
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
            this.artifactService.closeArtifact()
            this.mapService.removeFocusedLayer()
            this.activeComputation = undefined
        }
    }

    closeArtifactEvent(): void {
        this.artifactService.isArtifactVisible = false
        if (this.activeArtifact) {
            this.activeArtifact = undefined
        }
    }

    storeActiveArtifact(artifact: ArtifactEntity) {
        if (artifact) {
            this.activeArtifact = artifact

            localStorage.setItem(
                'active_artifact',
                JSON.stringify({
                    correlation_uuid: artifact.correlation_uuid,
                    store_id: artifact.store_id
                } as ActiveArtifactRef)
            )
        } else {
            console.error('Cannot persist active artifact: ', artifact)
        }
    }

    activateArtifact() {
        if (this.computations.length == this.currentRuns.length) {
            const storedItem = localStorage.getItem('active_artifact')
            if (storedItem) {
                const activeArtifactRef = JSON.parse(storedItem) as ActiveArtifactRef
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

    viewParameters(computation: ComputationEntity) {
        this.dialog.open(this.parametersDialog, {
            data: { parameters: JSON.stringify(computation.params) },
            autoFocus: false
        })
    }

    closeDialog() {
        this.dialog.closeAll()
    }

    archiveComputation(correlation_uuid: string): void {
        const computationToArchive = this.currentRuns.find(
            (computation: ComputationEntity) => computation.correlation_uuid === correlation_uuid
        )
        const isCurrentComputation =
            this.activeComputation && this.activeComputation.correlation_uuid === correlation_uuid

        if (computationToArchive) {
            this.currentRuns = this.currentRuns.filter(
                (run: ComputationEntity) => run.correlation_uuid !== correlation_uuid
            )
            this.archivedComputations.push(computationToArchive)
            this.updateLocalStorage()
            this.refreshDataSource()
        } else {
            console.error('Computation to archive not found in current runs')
        }

        if (isCurrentComputation) {
            this.artifactService.resetArtifacts()
        }
    }

    unarchiveComputation(correlation_uuid: string): void {
        const computationToUnarchive = this.archivedComputations.find(
            (computation: ComputationEntity) => computation.correlation_uuid === correlation_uuid
        )

        if (computationToUnarchive) {
            this.archivedComputations = this.archivedComputations.filter(
                (a: ComputationEntity) => a.correlation_uuid !== correlation_uuid
            )
            this.currentRuns.push(computationToUnarchive)
            this.updateLocalStorage()

            this.fetchAndProcessComputations(computationToUnarchive)
        } else {
            console.error('Computation to unarchive not found in archivedComputations')
        }
    }

    private updateLocalStorage() {
        localStorage.setItem('plugin_runs', JSON.stringify(this.currentRuns))
        localStorage.setItem('archive_runs', JSON.stringify(this.archivedComputations))
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
}
