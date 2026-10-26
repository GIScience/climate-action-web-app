import { CommonModule, NgClass } from '@angular/common'
import { Component, computed, DestroyRef, inject, Input, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router'
import { AppwriteService } from '@app/auth/appwrite.service'
import { StorageService } from '@app/storage.service'
import { environment } from '@environments/environment'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import {
    LucideBookmark,
    LucideCheck,
    LucideClock,
    LucideHash,
    LucideImport,
    LucideLoader,
    LucideLoaderCircle,
    LucideShare2
} from '@lucide/angular'
import { TippyDirective } from '@ngneat/helipopper'
import { Models } from 'appwrite'
import { compareDesc } from 'date-fns'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ToastrService } from 'ngx-toastr'
import { filter } from 'rxjs'
import {
    RunFailureDialogComponent,
    RunFailureDialogData
} from '../common/run-failure-dialog/run-failure-dialog.component'
import { isPendingStatus, statusRank } from '../common/status-rank.util'
import { AOI_ORIGINAL_TYPES, ExternalInput, Plugin } from '../plugin/plugin.interface'
import { PluginService } from '../plugin/plugin.service'
import { ReportService } from '../report/report.service'
import { ShareService } from '../share/share.service'
import { FilterByCriteriaPipe } from './computation-filters.pipe'
import { formatComputationTimestamp, formatShortUUID } from './computation-format.utils'
import { ComputationSearchService } from './computation-search.service'
import { ComputationSyncService, RunStateTransition } from './computation-sync.service'
import {
    ComputationDatabaseEntity,
    ComputationDisplayEntity,
    ComputationMetadata,
    DiscoverTab
} from './computation.interface'
import { mapDatabaseComputation } from './computation.mapper'

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
        LucideHash,
        LucideImport,
        LucideLoader,
        LucideLoaderCircle,
        LucideShare2,
        TranslocoModule
    ],
    templateUrl: './computations-index.component.html',
    styleUrl: './computations-index.component.scss',
    providers: [ComputationSearchService, ComputationSyncService]
})
export class ComputationsIndexComponent implements OnInit {
    private pluginService = inject(PluginService)
    private searchService = inject(ComputationSearchService)
    private route = inject(ActivatedRoute)
    private router = inject(Router)
    private shareService = inject(ShareService)
    private toastr = inject(ToastrService)
    private dialog = inject(MatDialog)
    private storageService = inject(StorageService)
    private appwriteService = inject(AppwriteService)
    private reportService = inject(ReportService)
    private translocoService = inject(TranslocoService)
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

    user: Models.User<Models.Preferences> | null = null

    constructor() {
        this.appwriteService._user.pipe(takeUntilDestroyed()).subscribe(user => {
            this.user = user
        })

        this.pluginId = this.route.snapshot.params['name']
    }

    formatTimestamp(timestamp: Date | string) {
        return formatComputationTimestamp(timestamp, this.translocoService.getActiveLang())
    }

    formatUUID = formatShortUUID

    ngOnInit(): void {
        this.loadInitialPluginRuns()

        if (this.activeTab === 'discover') {
            this.searchService.ensureLoaded(this.pluginId)
            if (!this.isDetailRouteActive()) {
                this.searchService.showSearchLayers(this.pluginId)
            }
        }

        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.syncSearchLayersWithRoute())

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
            .subscribe(transition => this.transitionRunStatus(transition))

        this.pluginService
            .getPluginRuns()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.refreshRunsFromStorage()
            })

        this.reportService.isVisible$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(isVisible => {
            this.isReportVisible = isVisible
        })
    }

    private async loadRuns(isInitialLoad: boolean = true): Promise<void> {
        if (!isInitialLoad && (!this.paginationInfo.hasMore || this.paginationInfo.loading)) return

        try {
            this.paginationInfo = { hasMore: true, loading: true }

            const result = await this.storageService.getPluginRunsPaginated(this.pluginId, isInitialLoad)

            this.paginationInfo = { hasMore: result.hasMore, loading: false }

            this.upsertRuns(result.documents)

            if (isInitialLoad) {
                this.startPeriodicSync()
            }
        } catch (error) {
            console.error(`Error loading ${isInitialLoad ? 'initial' : 'more'} runs:`, error)
        }
    }

    private refreshRunsFromStorage(): void {
        const stored = this.storageService
            .getComputesByStatus(['PENDING', 'STARTED', 'SUCCESS'])
            .filter(run => run.pluginId === this.pluginId)

        this.upsertRuns(stored)

        const storedIds = new Set(stored.map(run => run.correlation_uuid))
        this.runs.update(list =>
            list.filter(run => run.pluginId !== this.pluginId || storedIds.has(run.correlation_uuid))
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
        this.activeTab = tab
        this.storageService.saveActiveTab(tab)
        if (tab === 'discover') {
            this.searchService.ensureLoaded(this.pluginId)
            this.searchService.showSearchLayers(this.pluginId)
        } else {
            this.searchService.hideSearchLayers()
        }
    }

    private isDetailRouteActive(): boolean {
        return !!this.route.firstChild
    }

    private syncSearchLayersWithRoute(): void {
        if (this.activeTab !== 'discover') return
        if (this.isDetailRouteActive()) {
            this.searchService.hideSearchLayers()
        } else {
            this.searchService.showSearchLayers(this.pluginId)
        }
    }

    openComputation(computation: ComputationDisplayEntity): void {
        this.router.navigate(['computation', computation.correlation_uuid], { relativeTo: this.route })
    }

    isNewRun(computation: ComputationDisplayEntity): boolean {
        return computation.flags?.includes('NEW') ?? false
    }

    private transitionRunStatus({ run, newStatus, message }: RunStateTransition) {
        this.pluginService.updateRunStatus(run.correlation_uuid, newStatus)

        run.status = newStatus
        this.upsertRuns([run])

        if (newStatus === 'SUCCESS') {
            this.searchService.markStale()
            if (this.activeTab === 'discover') {
                this.searchService.ensureLoaded(this.pluginId)
                if (!this.isDetailRouteActive()) {
                    this.searchService.showSearchLayers(this.pluginId)
                }
            }
            this.storageService.markAsNew(run.correlation_uuid)
            this.toastr.success(
                `<strong>${this.pluginService.getPluginNameById(run.pluginId || '')}</strong> computation for <strong>${run.aoiName}</strong> (ID: #${this.formatUUID(run.correlation_uuid)}) has completed successfully.`,
                '',
                {
                    timeOut: 7000,
                    enableHtml: true
                }
            )
        } else if (newStatus === 'FAILURE' || newStatus === 'REVOKED') {
            this.openRunFailureDialog(run, newStatus === 'REVOKED', message)
        }
    }

    private openRunFailureDialog(run: ComputationDatabaseEntity, revoked: boolean, message?: string) {
        const pluginName = this.pluginService.getPluginNameById(run.pluginId || '')
        const subject = this.translocoService.translate('computationsIndex.runFailure.emailSubject', {
            id: this.formatUUID(run.correlation_uuid)
        })
        const body = this.translocoService.translate('computationsIndex.runFailure.emailBody', {
            plugin: pluginName,
            id: run.correlation_uuid
        })
        const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        const data: RunFailureDialogData = {
            revoked,
            pluginName,
            aoiName: run.aoiName,
            correlationUuid: run.correlation_uuid,
            message,
            mailto: `mailto:${environment.supportEmail}?${query}`
        }
        this.dialog.open<RunFailureDialogComponent, RunFailureDialogData>(RunFailureDialogComponent, {
            data,
            autoFocus: false
        })
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
        await this.storageService.deleteComputation(correlation_uuid)

        this.runs.update(list => list.filter(run => run.correlation_uuid !== correlation_uuid))

        this.toastr.info(this.translocoService.translate('computationsIndex.bookmarkRemoved'), '', {
            timeOut: 3000
        })
    }

    getAppwriteUrl(path: string): string {
        return this.appwriteService.getAppwriteUrl(path)
    }

    getRedirectUrl(): string {
        return this.appwriteService.getRedirectUrl()
    }

    private startPeriodicSync() {
        this.syncService.start(() => this.runs().filter(run => isPendingStatus(run.status)))
    }

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
}
