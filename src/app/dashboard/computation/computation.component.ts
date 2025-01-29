import { AnimationEvent, animate, state, style, transition, trigger } from '@angular/animations'
import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { TippyDirective } from '@ngneat/helipopper'
import { Observable, Subscription } from 'rxjs'
import { Artifact, ArtifactEntity } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationEntity } from '../computations-index/computation.interface'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'

@Component({
    selector: 'app-computation',
    standalone: true,
    imports: [CommonModule, MatIconModule, TippyDirective],
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
    templateUrl: './computation.component.html',
    styleUrls: ['./computation.component.scss']
})
export class ComputationComponent {
    @Input() computation!: ComputationEntity
    @Input() activeArtifact?: ArtifactEntity
    @Output() artifactActivated = new EventEmitter<ArtifactEntity>()

    private subscription: Subscription | undefined

    constructor(
        private artifactService: ArtifactService,
        private pluginService: PluginService,
        private mapService: MapService
    ) {}

    onAnimationEvent(event: AnimationEvent, computation: ComputationEntity) {
        if (event.toState === 'collapsed') {
            computation.keepInDOM = false
        }
    }

    showMore(computation: ComputationEntity) {
        computation.showSecondaryArtifacts = true
    }

    showLess(computation: ComputationEntity) {
        computation.showSecondaryArtifacts = false
    }

    hasSecondaryArtifacts(computation: ComputationEntity): boolean {
        return computation.artifacts.some(artifact => !artifact.primary)
    }

    renderArtifact(artifact: ArtifactEntity) {
        this.pluginService.collapsePluginCatalog()
        artifact.isLoading = true
        this.artifactService.resetArtifacts()

        const waitForMapRender = (artifact: ArtifactEntity): Promise<void> => {
            return new Promise<void>(resolve => {
                this.mapService.map?.once('rendercomplete', () => {
                    this.artifactService.getLegend(artifact)
                    artifact.isLoading = false
                    resolve()
                })
            })
        }

        // Allow for any type of report
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const waitForArtifactFetch = (observable: Observable<any>, dataCheck: (data: any) => boolean) => {
            this.subscription = observable.subscribe({
                next: data => {
                    if (dataCheck(data)) {
                        artifact.isLoading = false
                        if (this.subscription) {
                            this.subscription.unsubscribe()
                        }
                    }
                },
                error: err => {
                    console.error('Error fetching artifact:', err)
                    artifact.isLoading = false
                    if (this.subscription) {
                        this.subscription.unsubscribe()
                    }
                }
            })
        }

        const artifact_f = {
            IMAGE: (x: Artifact) => {
                this.artifactService.getImage(x)
                waitForArtifactFetch(this.artifactService.image, data => !!data?.url)
            },
            MARKDOWN: (x: Artifact) => {
                this.artifactService.getMarkdown(x)
                waitForArtifactFetch(this.artifactService.markdown, data => !!data?.url)
            },
            CHART: (x: Artifact) => {
                this.artifactService.getChart(x)
                waitForArtifactFetch(this.artifactService.chart, data => !!data?.data)
            },
            TABLE: (x: Artifact) => {
                this.artifactService.getTable(x)
                waitForArtifactFetch(this.artifactService.table, data => !!data?.url)
            },
            MAP_LAYER_GEOJSON: (x: Artifact) => {
                this.artifactService.getGeoJson(x)
                return waitForMapRender(x)
            },
            MAP_LAYER_GEOTIFF: (x: Artifact) => {
                this.artifactService.getGeoTiff(x)
                return waitForMapRender(x)
            }
        }

        this.artifactService.clearLegend()
        if (artifact) {
            this.artifactService.isArtifactVisible = true
            artifact_f[artifact.modality](artifact)
        }
    }

    storeActiveArtifact(artifact: ArtifactEntity) {
        this.artifactActivated.emit(artifact)
    }
}
