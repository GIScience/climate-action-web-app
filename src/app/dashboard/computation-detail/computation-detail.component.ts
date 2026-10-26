import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatDialog } from '@angular/material/dialog'
import { ActivatedRoute } from '@angular/router'
import { StorageService } from '@app/storage.service'
import { SupportedLanguage } from '@app/types/language.types'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import {
    LucideBookmark,
    LucideClock,
    LucideFileExclamationPoint,
    LucideHash,
    LucideListTodo,
    LucideMessageSquareWarning,
    LucideRotateCw
} from '@lucide/angular'
import { TippyDirective } from '@ngneat/helipopper'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ToastrService } from 'ngx-toastr'
import { Subject, catchError, map, of, switchMap } from 'rxjs'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactEntity } from '../artifact/artifact.interface'
import {
    ComputationParametersDialogComponent,
    ComputationParametersDialogData
} from '../common/computation-parameters-dialog/computation-parameters-dialog.component'
import { ComputationComponent } from '../computation/computation.component'
import {
    formatComputationTimestamp,
    formatShortUUID,
    getLanguageMismatchTooltip
} from '../computations-index/computation-format.utils'
import {
    ComputationDatabaseEntity,
    ComputationDisplayEntity,
    ComputationMetadata
} from '../computations-index/computation.interface'
import { mapHydratedComputation } from '../computations-index/computation.mapper'
import { MapArtifactManagerService } from '../map/map-artifact-manager.service'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { ReportService } from '../report/report.service'

type DetailState = 'loading' | 'ready' | 'not-found' | 'error'

@Component({
    selector: 'app-computation-detail',
    imports: [
        LucideBookmark,
        LucideClock,
        LucideFileExclamationPoint,
        LucideHash,
        LucideListTodo,
        LucideMessageSquareWarning,
        LucideRotateCw,
        TippyDirective,
        TranslocoModule,
        NgScrollbarModule,
        ComputationComponent
    ],
    templateUrl: './computation-detail.component.html',
    styleUrl: './computation-detail.component.scss'
})
export class ComputationDetailComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute)
    private pluginService = inject(PluginService)
    private storageService = inject(StorageService)
    private mapService = inject(MapService)
    private mapArtifactManager = inject(MapArtifactManagerService)
    private artifactViewerService = inject(ArtifactViewerService)
    private reportService = inject(ReportService)
    private toastr = inject(ToastrService)
    private translocoService = inject(TranslocoService)
    private dialog = inject(MatDialog)
    private destroyRef = inject(DestroyRef)

    computation?: ComputationDisplayEntity
    state: DetailState = 'loading'
    activeArtifact?: ArtifactEntity
    isReportVisible = false
    readonly isBookmarked = signal(false)

    private pluginLanguage: SupportedLanguage = SupportedLanguage.EN
    private currentUuid: string | null = null
    private loadRequests = new Subject<string>()

    ngOnInit(): void {
        this.loadRequests
            .pipe(
                switchMap(uuid => {
                    this.state = 'loading'
                    this.computation = undefined
                    this.activeArtifact = undefined

                    this.pluginService.setComputeState('inactive')
                    this.pluginService.collapsePluginCatalog()

                    return this.pluginService.getComputationMetadata(uuid).pipe(
                        map(metadata => ({ uuid, metadata, error: null })),
                        catchError(error => of({ uuid, metadata: null, error }))
                    )
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(({ uuid, metadata, error }) => {
                if (!metadata) {
                    console.error('Error loading computation:', uuid, error)
                    this.state = error?.status === 404 ? 'not-found' : 'error'
                    return
                }
                this.showComputation(uuid, metadata)
            })

        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const uuid = params.get('uuid')
            if (!uuid || uuid === this.currentUuid) return
            if (this.currentUuid) {
                this.teardown(this.currentUuid)
            }
            this.currentUuid = uuid
            this.updateBookmarkState()
            this.load(uuid)
        })

        this.storageService
            .getPluginRunsObservable()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.updateBookmarkState()
            })

        this.reportService.isVisible$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(isVisible => {
            this.isReportVisible = isVisible
        })

        this.pluginService.activePlugin$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(plugin => {
            this.pluginLanguage = plugin?.language ?? SupportedLanguage.EN
        })

        this.artifactViewerService.isViewerVisible$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(isVisible => {
            if (!isVisible && this.activeArtifact) {
                this.clearActiveArtifact()
            }
        })

        this.mapArtifactManager.activeMapArtifacts$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(layers => {
            if (!this.activeArtifact) return
            const stillOnMap = layers.some(
                layer =>
                    layer.artifact.correlation_uuid === this.activeArtifact!.correlation_uuid &&
                    layer.artifact.filename === this.activeArtifact!.filename
            )
            if (!stillOnMap) {
                this.clearActiveArtifact()
            }
        })
    }

    ngOnDestroy(): void {
        if (this.currentUuid) {
            this.teardown(this.currentUuid)
        }
    }

    private load(uuid: string): void {
        this.loadRequests.next(uuid)
    }

    private showComputation(uuid: string, metadata: ComputationMetadata): void {
        const computation = mapHydratedComputation(
            {
                correlation_uuid: uuid,
                request_ts: metadata.request_ts,
                status: metadata.status,
                artifacts: []
            },
            metadata
        )
        computation.isExpanded = true
        computation.keepInDOM = true
        this.computation = computation
        this.state = 'ready'

        if (computation.geometry) {
            const extent = this.mapService.highlightAoI(computation.geometry)
            if (extent) {
                this.mapService.flyToExtent(extent)
            }
        }

        this.storageService.markAsViewed(uuid)
    }

    retry(): void {
        if (this.currentUuid) {
            this.load(this.currentUuid)
        }
    }

    onArtifactActivated(artifact: ArtifactEntity): void {
        this.activeArtifact = artifact
        this.mapArtifactManager.setActiveArtifactId(artifact)
    }

    async toggleBookmark(event?: Event): Promise<void> {
        event?.stopPropagation()
        if (!this.computation) return

        if (this.isBookmarked()) {
            await this.storageService.deleteComputation(this.computation.correlation_uuid)
            this.toastr.info(this.translocoService.translate('computationsIndex.bookmarkRemoved'), '', {
                timeOut: 3000
            })
        } else {
            const entity: ComputationDatabaseEntity = {
                correlation_uuid: this.computation.correlation_uuid,
                request_ts: this.computation.request_ts,
                status: 'SUCCESS',
                aoiName: this.computation.aoiName,
                pluginId: this.computation.pluginId,
                language: this.computation.language
            }
            await this.pluginService.storeNewComputes(entity)
            this.toastr.success(this.translocoService.translate('computationsIndex.bookmarkAdded'), '', {
                timeOut: 3000
            })
        }
    }

    viewParameters(event?: Event): void {
        event?.stopPropagation()
        this.dialog.open<ComputationParametersDialogComponent, ComputationParametersDialogData>(
            ComputationParametersDialogComponent,
            {
                data: {
                    params: this.computation?.params,
                    requestedParams: this.computation?.requested_params
                },
                autoFocus: false
            }
        )
    }

    formatTimestamp(timestamp: Date | string): string {
        return formatComputationTimestamp(timestamp, this.translocoService.getActiveLang())
    }

    formatUUID = formatShortUUID

    getLanguageMismatchTooltip(computation: Pick<ComputationDisplayEntity, 'language'>): string | null {
        return getLanguageMismatchTooltip(computation, this.pluginLanguage, this.translocoService)
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

    private updateBookmarkState(): void {
        const uuid = this.currentUuid
        this.isBookmarked.set(!!uuid && this.storageService.getPluginRuns().some(run => run.correlation_uuid === uuid))
    }

    private clearActiveArtifact(): void {
        this.activeArtifact = undefined
        this.mapArtifactManager.setActiveArtifactId(null)
    }

    private teardown(uuid: string): void {
        this.activeArtifact = undefined
        this.artifactViewerService.closeArtifactViewer()
        this.mapService.removeFocusedLayer()
        this.mapArtifactManager.clearTransientArtifacts(uuid)
        this.mapArtifactManager.setActiveArtifactId(null)
    }
}
