import {Component, OnInit} from '@angular/core'
import {PluginService} from '../services/plugin.service'
import {ActiveArtifactRef, Artifact, ArtifactFlatNode, ArtifactNode} from './artifact.interface'
import {ReportService} from '../services/report.service'
import {PluginRun} from '../plugin/plugin.interface'
import {FlatTreeControl} from '@angular/cdk/tree'
import {MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule} from '@angular/material/tree'
import {MatIconModule} from '@angular/material/icon'
import {MatButtonModule} from '@angular/material/button'
import {BehaviorSubject} from 'rxjs'
import {NgClass, NgIf} from '@angular/common'
import {MatTooltipModule} from '@angular/material/tooltip'
import {NotificationService} from '../notification/notification.service'
import moment from 'moment/moment'


const ARTIFACT_ICON_MAP = {
    'IMAGE': 'image',
    'MARKDOWN': 'description',
    'CHART': 'bar_chart',
    'TABLE': 'table_chart',
    'MAP_LAYER_GEOJSON': 'layers',
    'MAP_LAYER_GEOTIFF': 'map'
}

const STATUS_ICON_MAP = {
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
        MatIconModule,
        MatTooltipModule,
        NgIf,
        NgClass
    ],
    standalone: true
})
export class ArtifactComponent implements OnInit {

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
    dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
    currentRuns: PluginRun[] = []
    activeNode?: ArtifactFlatNode

    constructor(private pluginService: PluginService,
                private reportService: ReportService,
                private notificationService: NotificationService) {
    }

    ngOnInit(): void {
        this.currentRuns = this.pluginService.getComputes()

        this.dataChange.subscribe(data => {
            if (data.length > 0) {
                this.dataSource.data = data
                this.activateNode()
            }
        })

        this.fetchArtifacts()
        this.syncRuns()
    }

    fetchArtifacts() {
        this.currentRuns.forEach(currentRun => {
            this.syncArtifact(currentRun)
        })
    }

    syncRuns() {
        this.notificationService.startWebSocket().subscribe({
            next: (message) => {
                switch (message.type) {
                    case undefined:
                    case 'computation_status': {
                        this.currentRuns = this.pluginService.getComputes()

                        const run = this.currentRuns.find(x => x.correlation_uuid === message.correlation_uuid)
                        if (run && message.status) {
                            run.status = message.status
                            this.pluginService.updateRunStatus(run.correlation_uuid, message.status)
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
                        })

                        this.pluginService.updateRunStatus(run.correlation_uuid, 'completed')
                    } else {
                        this.pluginService.updateRunStatus(run.correlation_uuid, 'in-progress')
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
            return moment(a.timestamp) > moment(b.timestamp) ? 1 : -1
        })
        this.dataChange.next(this.nodes)
    }

    isParent = (_: number, node: ArtifactFlatNode) => node.level == 0;

    renderReport(node: ArtifactFlatNode) {
        const report_f = {
            'IMAGE': (x: Artifact) => this.reportService.getImage(x),
            'MARKDOWN': (x: Artifact) => this.reportService.getMarkdown(x),
            'CHART': (x: Artifact) => this.reportService.getChart(x),
            'TABLE': (x: Artifact) => this.reportService.getTable(x),
            'MAP_LAYER_GEOJSON': (x: Artifact) => this.reportService.getGeoJson(x),
            'MAP_LAYER_GEOTIFF': (x: Artifact) => this.reportService.getGeoTiff(x)
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
}
