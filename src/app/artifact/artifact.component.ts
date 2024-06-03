import {Component, OnDestroy, OnInit} from '@angular/core'
import {PluginService} from '../plugin/plugin.service'
import {ActiveArtifactRef, Artifact, ArtifactFlatNode, ArtifactNode} from './artifact.interface'
import {ReportService} from '../report/report.service'
import {PluginRun} from '../plugin/plugin.interface'
import {FlatTreeControl} from '@angular/cdk/tree'
import {MatListModule} from '@angular/material/list'
import {MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule} from '@angular/material/tree'
import {MatIconModule} from '@angular/material/icon'
import {MatButtonModule} from '@angular/material/button'
import {BehaviorSubject, Subscription} from 'rxjs'
import {NgClass, NgIf, CommonModule} from '@angular/common'
import {MatTooltipModule} from '@angular/material/tooltip'
import {NotificationService} from '../notification/notification.service'
import {TuiDropdownModule} from '@taiga-ui/core'
import {TuiActiveZoneModule} from '@taiga-ui/cdk'
import moment from 'moment/moment'


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

const STATUS_ICON_MAP: { [index: string]: string } = {
    'completed': 'check_circle_outline',
    'scheduled': 'scheduled',
    'in-progress': 'scheduled',
    'failed': 'highlight_off',
    'wrong-input': 'highlight_off'
}

@Component({
    selector: 'app-artifacts',
    templateUrl: './artifact.component.html',
    styleUrls: ['./artifact.component.scss'],
    imports: [
        MatTreeModule,
        MatButtonModule,
        MatListModule,
        MatIconModule,
        MatTooltipModule,
        NgIf,
        NgClass,
        TuiDropdownModule,
        TuiActiveZoneModule,
        CommonModule
    ],
    standalone: true
})
export class ArtifactComponent implements OnInit, OnDestroy {

    private _transformer = (node: ArtifactNode, level: number): ArtifactFlatNode => {
        return {
            expandable: !!node.children && node.children.length > 0,
            name: node.name,
            level: level,
            uuid: node.uuid,
            icon: node.icon,
            status: node.status,
            summary: node.summary,
            ref: node.ref,
            timestamp: moment(node.timestamp).format('MMMM Do YYYY, HH:mm:ss Z')
        }
    }

    treeControl = new FlatTreeControl<ArtifactFlatNode>(
        node => node.level,
        node => node.expandable
    )

    treeFlattener = new MatTreeFlattener(
        this._transformer,
        node => node.level,
        node => node.expandable,
        node => node.children
    )

    nodes: ArtifactNode[] = []
    dataChange = new BehaviorSubject<ArtifactNode[]>([])
    dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener)
    currentRuns: PluginRun[] = []
    activeNode?: ArtifactFlatNode
    sync?: Subscription
    archivedArtifacts: any[] = []
    open = false

    constructor(private pluginService: PluginService,
                private reportService: ReportService,
                private notificationService: NotificationService) {
    }

    ngOnInit(): void {
        this.currentRuns = this.pluginService.getComputes()
        this.fetchArchivedArtifacts()

        this.dataChange.subscribe(data => {
            if (data.length > 0) {
                this.dataSource.data = data
                this.activateNode()
            }
        })

        this.fetchArtifacts()
        this.sync = this.syncRuns()
    }

    onClick() {
        this.open = !this.open
    }

    onActiveZone(active: boolean): void {
        this.open = active && this.open
    }

    ngOnDestroy() {
        if (this.sync)
            this.sync.unsubscribe()
    }

    fetchArtifacts() {
        this.currentRuns.forEach(currentRun => {
            this.syncArtifact(currentRun)
        })
    }

    fetchArchivedArtifacts() {
        const archivedItems = localStorage.getItem('archive_runs')
        if (archivedItems) {
            this.archivedArtifacts = JSON.parse(archivedItems)
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
        this.pluginService.getArtifacts(run.correlation_uuid)
            .subscribe({
                next: (artifacts: Artifact[]) => {
                    if (!artifacts)
                        return

                    const node: ArtifactNode = {
                        name: run.pluginName,
                        uuid: run.correlation_uuid,
                        children: [],
                        icon: run.status && STATUS_ICON_MAP[run.status] || 'scheduled',
                        status: run.status || 'scheduled',
                        timestamp: run.timestamp
                    }

                    if (Array.isArray(artifacts) && artifacts.length > 0) {
                        node.children = artifacts.map<ArtifactNode>((x) => {
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
                    }
                    this.updateNode(run.correlation_uuid, node)
                },
                error: () => {
                    const node: ArtifactNode = {
                        name: run.pluginName,
                        uuid: run.correlation_uuid,
                        children: [],
                        icon: STATUS_ICON_MAP['failed'],
                        status: 'failed',
                        timestamp: run.timestamp
                    }
                    this.updateNode(run.correlation_uuid, node)
                    this.pluginService.updateRunStatus(run.correlation_uuid, 'failed')
                }
            })
    }

    updateNode(correlation_uuid: string, node: ArtifactNode) {
        this.nodes = this.nodes.filter((x) => x.uuid != correlation_uuid)
        this.nodes.push(node)
        this.nodes.sort((a, b) => {
            return moment(a.timestamp) < moment(b.timestamp) ? 1 : -1
        })
        this.dataChange.next(this.nodes)
    }

    isParent = (_: number, node: ArtifactFlatNode) => node.level == 0

    renderReport(node: ArtifactFlatNode) {
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
        if (node.ref) {
            return report_f[node.ref.modality](node.ref)
        }
    }

    storeActivatedRef(node: ArtifactFlatNode) {
        if (node.ref) {
            this.activeNode = node

            localStorage.setItem('active_node', JSON.stringify({
                correlation_uuid: node.ref.correlation_uuid,
                store_uuid: node.ref.store_id
            } as ActiveArtifactRef))

        } else {
            console.error('Cannot persist active node: ', node.uuid)
        }
    }

    activateNode() {
        if (this.nodes.length == this.currentRuns.length) {
            const storedItem = localStorage.getItem('active_node')
            if (storedItem) {
                const activeArtifactRef = JSON.parse(storedItem) as ActiveArtifactRef
                const parentNode = this.treeControl.dataNodes.find((x) => x.uuid === activeArtifactRef.correlation_uuid)
                if (parentNode) {
                    this.treeControl.expand(parentNode)
                    this.activeNode = this.treeControl.getDescendants(parentNode).find((x) => x.uuid === activeArtifactRef.store_uuid)
                    if (this.activeNode) {
                        this.renderReport(this.activeNode)
                    }
                }
            }
        }
    }

    archiveArtifact(correlation_uuid: string): void {
        const artifactToArchive = this.currentRuns.find((artifact: PluginRun) => artifact.correlation_uuid === correlation_uuid)
        const isCurrentArtifact = this.activeNode && this.activeNode.ref && this.activeNode.ref.correlation_uuid === correlation_uuid
        
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
        const artifactToUnarchive = this.archivedArtifacts.find((artifact: any) => artifact.correlation_uuid === correlation_uuid)
    
        if (artifactToUnarchive) {
            this.archivedArtifacts = this.archivedArtifacts.filter((a: any) => a.correlation_uuid !== correlation_uuid)
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
        this.nodes = this.nodes.filter(node => 
            this.currentRuns.some(run => run.correlation_uuid === node.uuid)
        )
        this.dataChange.next(this.nodes)
        this.dataSource.data = this.nodes
    }
}