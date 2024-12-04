import {Component, Input, OnDestroy, OnInit} from '@angular/core'
import {animate, AnimationEvent, state, style, transition, trigger} from '@angular/animations'
import {PluginService} from '../plugin/plugin.service'
import {ActiveArtifactRef, Artifact, ArtifactComputation, ArtifactMetadata} from './artifact.interface'
import {ReportService} from '../report/report.service'
import {MapService} from '../map/map.service'
import {PluginRun} from '../plugin/plugin.interface'
import {MatIconModule} from '@angular/material/icon'
import {BehaviorSubject, Subscription} from 'rxjs'
import {CommonModule, NgClass, NgIf} from '@angular/common'
import {MatTooltipModule} from '@angular/material/tooltip'
import {NotificationService} from '../../notification/notification.service'
import {NgScrollbarModule} from 'ngx-scrollbar'
import {ActivatedRoute} from '@angular/router'
import {FilterByCriteriaPipe} from './artifact-filters.pipe'
import moment from 'moment/moment'
import {Archive, ArchiveRestore, CircleArrowLeft, Clock, FileWarning, Hash, LucideAngularModule} from 'lucide-angular'
import {MatSnackBar} from '@angular/material/snack-bar'

const ARTIFACT_ICON_MAP: { [index: string]: string } = {
    'IMAGE': 'image',
    'MARKDOWN': 'description',
    'CHART': 'bar_chart',
    'TABLE': 'table_chart',
    'MAP_LAYER_GEOJSON': 'layers',
    'MAP_LAYER_GEOTIFF': 'map'
}

const ARTIFACT_ORDER_MAP: { [index: string]: number } = {
    'description': 1,
    'image': 2,
    'layers': 3,
    'map': 4,
    'bar_chart': 5,
    'table_chart': 6
}

@Component({
    selector: 'app-artifacts',
    templateUrl: './artifact.component.html',
    styleUrls: ['./artifact.component.scss'],
    imports: [
        MatIconModule,
        MatTooltipModule,
        NgIf,
        NgClass,
        CommonModule,
        NgScrollbarModule,
        FilterByCriteriaPipe,
        LucideAngularModule
    ],
    animations: [
        trigger('expandCollapse', [
            state('collapsed', style({
                height: '0',
                padding: '0',
                visibility: 'hidden'
            })),
            state('expanded', style({
                height: '*',
                padding: '*',
                visibility: 'visible'
            })),
            transition('expanded <=> collapsed', [
                animate('250ms ease-in-out')
            ])
        ]),
        trigger('fadeIn', [
            state('in', style({opacity: 1})),
            transition(':enter', [
                style({opacity: 0}),
                animate('250ms ease-in')
            ])
        ])
    ],
    standalone: true
})
export class ArtifactComponent implements OnInit, OnDestroy {

    computations: ArtifactComputation[] = []
    dataChange = new BehaviorSubject<ArtifactComputation[]>([])
    currentRuns: PluginRun[] = []
    scheduledRuns: PluginRun[] = []
    activeComputation?: ArtifactComputation
    activeChildComputation?: ArtifactComputation
    sync?: Subscription
    archivedArtifacts: PluginRun[] = []
    showArchived = false
    newRuns: string[] = []
    currentLocale = navigator.language

    readonly Archive = Archive
    readonly ArchiveRestore = ArchiveRestore
    readonly CircleArrowLeft = CircleArrowLeft
    readonly Clock = Clock
    readonly Hash = Hash
    readonly FileWarning = FileWarning

    @Input() pluginId: string = ''

    scheduledRunsSubscription: Subscription = new Subscription()

    constructor(private pluginService: PluginService,
                public reportService: ReportService,
                private notificationService: NotificationService,
                private mapService: MapService,
                private route: ActivatedRoute,
                private snackBar: MatSnackBar) {

        if (this.pluginService.collapseComputations$) {
            this.pluginService.collapseComputations$.subscribe(() => {
                this.collapseComputation()
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

    formatUUID(uuid: string): string {
        return uuid.substring(0, 8)
    }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            const pluginId = params['name']
            this.pluginId = pluginId

            this.currentRuns = this.pluginService.getComputes()
            this.fetchArchivedArtifacts()

            this.dataChange.subscribe(data => {
                if (data.length > 0) {
                    this.computations = data
                    this.activateComputation()
                }
            })

            this.fetchArtifacts()
            this.sync = this.syncRuns()

            if (this.reportService.closeReportEvent) {
                this.reportService.closeReportEvent.subscribe(() => this.closeReportEvent())
            }
        })

        this.scheduledRuns = this.pluginService.getScheduledRuns()
        this.scheduledRunsSubscription = this.pluginService.getPluginRuns().subscribe(() => {
            this.scheduledRuns = this.pluginService.getScheduledRuns()
        })
    }

    toggleArchivedView(): void {
        this.showArchived = !this.showArchived
    }

    ngOnDestroy() {
        if (this.sync) this.sync.unsubscribe()
        if (this.scheduledRunsSubscription) this.scheduledRunsSubscription.unsubscribe()
    }

    fetchArtifacts() {
        this.currentRuns
            .filter(currentRun => currentRun.status === 'completed' || currentRun.status === 'scheduled' || currentRun.status === 'no-results')
            .forEach(currentRun => {
                this.syncArtifact(currentRun)
            })

        if (this.currentRuns.filter(run => run.pluginId === this.pluginId).length === 0) {
            this.pluginService.setPluginState('compute-ready')
        } else {
            this.pluginService.setPluginState('inactive')
        }
    }

    fetchArchivedArtifacts() {
        const archivedItems = localStorage.getItem('archive_runs')
        if (archivedItems) {
            this.archivedArtifacts = JSON.parse(archivedItems).filter((artifact: PluginRun) =>
                (artifact.status === 'completed' || 'scheduled' || 'no-results')
            )
        }
    }

    syncRuns() {
        return this.notificationService.startWebSocket().subscribe({
            next: (message) => {
                switch (message.type) {
                    case undefined:
                    case 'computation_status': {
                        this.currentRuns = this.pluginService.getComputes()
                        const run = this.currentRuns.find(x => x.correlation_uuid === message.correlation_uuid)
                        if (run && message.status) {
                            run.status = message.status
                            if (message.status === 'completed') {
                                this.newRuns.push(run.correlation_uuid)
                                this.updateNewRunsStorage()
                            } else if (message.status === 'wrong-input' || message.status === 'failed') {
                                this.snackBar.open(
                                    message.message || 'Error while computing plugin, please try again.',
                                    'Close',
                                    {
                                        verticalPosition: 'bottom',
                                        horizontalPosition: 'center',
                                        panelClass: ['error-snackbar']
                                    }
                                )
                            }
                            this.syncArtifact(run)
                        }
                    }
                }
            },
            error: (error) => console.error('WebSocket error:', error),
            complete: () => console.debug('WebSocket connection closed')
        })
    }

    syncArtifact(run: PluginRun) {
        this.pluginService.getArtifactsMetadata(run.correlation_uuid).subscribe({
            next: (response: ArtifactMetadata) => {
                const artifacts = response.artifacts
                if (!artifacts) return
                const computation: ArtifactComputation = {
                    name: run.pluginName,
                    uuid: run.correlation_uuid,
                    children: [],
                    status: run.status || 'scheduled',
                    timestamp: new Date(run.timestamp),
                    aoiName: response.aoi?.properties.name || response.params?.aoi?.properties.name,
                    geometry: response.aoi?.geometry || response.params?.aoi?.geometry,
                    pluginId: response.plugin_info?.plugin_id
                }

                if (Array.isArray(artifacts) && artifacts.length > 0) {
                    computation.children = artifacts.map<ArtifactComputation>((x) => {
                        return {
                            name: x.name,
                            uuid: x.store_id,
                            children: [],
                            icon: ARTIFACT_ICON_MAP[x.modality],
                            summary: x.summary,
                            ref: x
                        }
                    }).sort((a, b) => {
                        if (a.icon == b.icon) {
                            return a.name.localeCompare(b.name)
                        } else if (a.icon && b.icon && a.icon in ARTIFACT_ORDER_MAP && b.icon in ARTIFACT_ORDER_MAP) {
                            return ARTIFACT_ORDER_MAP[a.icon] - ARTIFACT_ORDER_MAP[b.icon]
                        }
                        return 0
                    })
                    this.pluginService.updateRunStatus(run.correlation_uuid, 'completed')
                } else if (artifacts.length === 0 && run.status !== 'no-results') {
                    this.snackBar.open(
                        'This run created no results. If you think that is an error, please contact the plugin developers.',
                        'Close',
                        {
                            verticalPosition: 'bottom',
                            horizontalPosition: 'center',
                            panelClass: ['error-snackbar']
                        }
                    )
                    this.pluginService.updateRunStatus(run.correlation_uuid, 'no-results')
                }
                this.updateComputation(run.correlation_uuid, computation)
            },
            error: () => {
                const computation: ArtifactComputation = {
                    name: run.pluginName,
                    uuid: run.correlation_uuid,
                    children: [],
                    status: 'failed',
                    timestamp: run.timestamp
                }
                this.updateComputation(run.correlation_uuid, computation)
                this.pluginService.updateRunStatus(run.correlation_uuid, 'failed')
            }
        })
    }

    updateComputation(correlation_uuid: string, computation: ArtifactComputation) {
        if (computation.status === 'completed' || computation.status === 'scheduled' || computation.status === 'no-results') {
            this.computations = this.computations.filter((x) => x.uuid != correlation_uuid)
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

    toggleComputation(computation: ArtifactComputation) {
        if (this.pluginService.pluginState$) {
            this.pluginService.setPluginState('inactive')
        }
        this.pluginService.closePluginCatalog()
        const previousActiveComputation = this.activeComputation

        if (previousActiveComputation) {
            previousActiveComputation.isExpanded = false
            setTimeout(() => previousActiveComputation.keepInDOM = false, 300)
            this.reportService.closeReport()
            this.mapService.removeFocusedLayer()
        }

        if (previousActiveComputation === computation) {
            this.activeComputation = undefined
            this.activeChildComputation = undefined
        } else {
            computation.keepInDOM = true
            setTimeout(() => computation.isExpanded = true, 0)
            this.activeComputation = computation

            if (computation && computation.geometry) {
                const geometry = computation.geometry
                const geoJsonData = {
                    'type': 'FeatureCollection',
                    'features': [{
                        'type': 'Feature',
                        'geometry': geometry,
                        'properties': {'name': 'AOI'}
                    }]
                }
                const extent = this.mapService.highlightAoI(geoJsonData)

                if (extent && this.mapService.map) {
                    this.mapService.map.getView().fit(extent, {
                        padding: this.mapService.calculateMapPadding()
                    })
                }
            }

            if (this.newRuns.includes(computation.uuid)) {
                this.removeNewRunMark(computation.uuid)
            }
        }
    }

    collapseComputation() {
        const previousActiveComputation = this.activeComputation

        if (previousActiveComputation) {
            previousActiveComputation.isExpanded = false
            setTimeout(() => previousActiveComputation.keepInDOM = false, 300)
            this.reportService.closeReport()
            this.mapService.removeFocusedLayer()
            this.activeComputation = undefined
        }
    }

    onAnimationEvent(event: AnimationEvent, computation: ArtifactComputation) {
        if (event.toState === 'collapsed') {
            computation.keepInDOM = false
        }
    }

    showMore(computation: ArtifactComputation) {
        computation.showSecondaryChildren = true
    }

    showLess(computation: ArtifactComputation) {
        computation.showSecondaryChildren = false
    }

    renderReport(computation: ArtifactComputation) {
        this.pluginService.closePluginCatalog()
        const report_f = {
            'IMAGE': (x: Artifact) => this.reportService.getImage(x),
            'MARKDOWN': (x: Artifact) => this.reportService.getMarkdown(x),
            'CHART': (x: Artifact) => this.reportService.getChart(x),
            'TABLE': (x: Artifact) => this.reportService.getTable(x),
            'MAP_LAYER_GEOJSON': (x: Artifact) => {
                this.reportService.getGeoJson(x)
                this.reportService.getLegend(x)
            },
            'MAP_LAYER_GEOTIFF': (x: Artifact) => {
                this.reportService.getGeoTiff(x)
                this.reportService.getLegend(x)
            }
        }
        this.reportService.clearLegend()
        if (computation.ref) {
            this.reportService.isReportVisible = true
            return report_f[computation.ref.modality](computation.ref)
        }
    }

    closeReportEvent(): void {
        this.reportService.isReportVisible = false
        if (this.activeChildComputation) {
            this.activeChildComputation = undefined
        }
    }

    storeActivatedRef(computation: ArtifactComputation) {
        if (computation.ref) {
            this.activeChildComputation = computation

            localStorage.setItem('active_child_computation', JSON.stringify({
                correlation_uuid: computation.ref.correlation_uuid,
                store_uuid: computation.ref.store_id
            } as ActiveArtifactRef))

        } else {
            console.error('Cannot persist active computation: ', computation.uuid)
        }
    }

    activateComputation() {
        if (this.computations.length == this.currentRuns.length) {
            const storedItem = localStorage.getItem('active_child_computation')
            if (storedItem) {
                const activeArtifactRef = JSON.parse(storedItem) as ActiveArtifactRef
                const parentComputation = this.computations.find((x) => x.uuid === activeArtifactRef.correlation_uuid)
                if (parentComputation) {
                    this.toggleComputation(parentComputation)
                    this.activeChildComputation = parentComputation.children.find((x) => x.uuid === activeArtifactRef.store_uuid)
                    if (this.activeChildComputation) {
                        this.renderReport(this.activeChildComputation)
                    }
                }
            }
        }
    }

    archiveArtifact(correlation_uuid: string): void {
        const artifactToArchive = this.currentRuns.find((artifact: PluginRun) => artifact.correlation_uuid === correlation_uuid)
        const isCurrentArtifact = this.activeComputation && this.activeComputation.ref && this.activeComputation.ref.correlation_uuid === correlation_uuid

        if (artifactToArchive) {
            this.currentRuns = this.currentRuns.filter((run: PluginRun) => run.correlation_uuid !== correlation_uuid)
            this.archivedArtifacts.push(artifactToArchive)
            this.updateLocalStorage()
            this.refreshDataSource()
        } else {
            console.error('Artifact to archive not found in current runs')
        }

        if (isCurrentArtifact) {
            this.reportService.resetReports()
        }
    }

    unarchiveArtifact(correlation_uuid: string): void {
        const artifactToUnarchive = this.archivedArtifacts.find((artifact: PluginRun) => artifact.correlation_uuid === correlation_uuid)

        if (artifactToUnarchive) {
            this.archivedArtifacts = this.archivedArtifacts.filter((a: PluginRun) => a.correlation_uuid !== correlation_uuid)
            this.currentRuns.push(artifactToUnarchive)
            this.updateLocalStorage()

            this.syncArtifact(artifactToUnarchive)
        } else {
            console.error('Artifact to unarchive not found in archivedArtifacts')
        }
    }

    private updateLocalStorage() {
        localStorage.setItem('plugin_runs', JSON.stringify(this.currentRuns))
        localStorage.setItem('archive_runs', JSON.stringify(this.archivedArtifacts))
    }

    private refreshDataSource() {
        this.computations = this.computations.filter(computation =>
            this.currentRuns.some(run => run.correlation_uuid === computation.uuid)
        )
        this.dataChange.next(this.computations)
    }

    hasSecondaryChildren(computation: ArtifactComputation): boolean {
        return computation.children.some(child => !child.ref?.primary)
    }
}