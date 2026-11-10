import { CommonModule, NgClass } from '@angular/common'
import {
    afterRenderEffect,
    Component,
    computed,
    DestroyRef,
    inject,
    Input,
    OnInit,
    signal,
    viewChild
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatDialog } from '@angular/material/dialog'
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router'
import { AppwriteService } from '@app/auth/appwrite.service'
import { StorageService } from '@app/storage.service'
import { environment } from '@environments/environment'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import {
    LucideBookmark,
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
import { NgScrollbar, NgScrollbarModule } from 'ngx-scrollbar'
import { NgScrollReachDrop } from 'ngx-scrollbar/reached-event'
import { ToastrService } from 'ngx-toastr'
import { filter } from 'rxjs'
import {
    RunFailureDialogComponent,
    RunFailureDialogData
} from '../common/run-failure-dialog/run-failure-dialog.component'
import { isPendingStatus, statusRank } from '../common/status-rank.util'
import { Plugin } from '../plugin/plugin.interface'
import { PluginService } from '../plugin/plugin.service'
import { ReportService } from '../report/report.service'
import { computationRouteCommands, ShareService } from '../share/share.service'
import { confirmUnbookmark, toBookmarkEntity } from './computation-bookmark.utils'
import { FilterByCriteriaPipe } from './computation-filters.pipe'
import { formatComputationTimestamp, formatShortUUID } from './computation-format.utils'
import { ComputationSearchService } from './computation-search.service'
import { ComputationSyncService, RunStateTransition } from './computation-sync.service'
import { ComputationDatabaseEntity, ComputationDisplayEntity, DiscoverTab } from './computation.interface'
import { mapDatabaseComputation } from './computation.mapper'

@Component({
    selector: 'app-computations-index',
    imports: [
        TippyDirective,
        NgClass,
        CommonModule,
        NgScrollbarModule,
        NgScrollReachDrop,
        FilterByCriteriaPipe,
        LucideBookmark,
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
    private toastr = inject(ToastrService)
    private dialog = inject(MatDialog)
    private storageService = inject(StorageService)
    private appwriteService = inject(AppwriteService)
    private reportService = inject(ReportService)
    private translocoService = inject(TranslocoService)
    private syncService = inject(ComputationSyncService)
    private shareService = inject(ShareService)
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

    paginationInfo: { hasMore: boolean; loading: boolean; pages: number } = {
        hasMore: true,
        loading: false,
        pages: 0
    }

    activeTab: DiscoverTab = this.storageService.getActiveTab('discover')
    readonly searchComputations = this.searchService.computations
    readonly searchLoading = this.searchService.loading
    readonly searchHasMore = this.searchService.hasMore
    readonly searchPages = this.searchService.pages

    @Input() pluginId: string = ''
    @Input() plugin?: Plugin

    user: Models.User<Models.Preferences> | null = null

    private readonly scrollbar = viewChild(NgScrollbar)

    constructor() {
        this.appwriteService._user.pipe(takeUntilDestroyed()).subscribe(user => {
            this.user = user
        })

        this.pluginId = this.route.snapshot.params['name']

        // ngx-scrollbar only emits reachedBottom once the viewport overflows,
        // so a short first page keeps fetching until it does (or the list ends)
        afterRenderEffect(() => {
            this.runs()
            this.searchComputations()
            const viewport = this.scrollbar()?.adapter.viewportElement
            if (!viewport || viewport.scrollHeight > viewport.clientHeight) return
            if (this.activeTab === 'bookmarks') {
                this.loadMoreBookmarks()
            } else {
                this.loadMoreSearch()
            }
        })
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
            const pages = isInitialLoad ? 0 : this.paginationInfo.pages
            this.paginationInfo = { hasMore: true, loading: true, pages }

            const result = await this.storageService.getPluginRunsPaginated(this.pluginId, isInitialLoad)

            this.paginationInfo = { hasMore: result.hasMore, loading: false, pages: pages + 1 }

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
                    existing.valid_until = entity.valid_until ?? existing.valid_until
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
    readonly loadMoreSearch = () => {
        // The scroll sentinel also fires at the end of a fully loaded list
        if (this.searchHasMore()) this.searchService.loadMore()
    }

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
            this.pluginService.storeValidUntil(run.correlation_uuid)
            const message = this.translocoService.translate('computationsIndex.runSucceeded', {
                plugin: this.pluginService.getPluginNameById(run.pluginId || ''),
                aoi: run.aoiName,
                id: this.formatUUID(run.correlation_uuid)
            })
            this.toastr
                .success(message, '', { timeOut: 7000, enableHtml: true })
                .onTap.subscribe(() =>
                    this.router.navigate(computationRouteCommands(run.pluginId || this.pluginId, run.correlation_uuid))
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

    isBookmarked(correlation_uuid: string): boolean {
        return this.bookmarkedIds().has(correlation_uuid)
    }

    toggleBookmark(computation: ComputationDisplayEntity, event: Event): void {
        event.stopPropagation()
        if (this.isBookmarked(computation.correlation_uuid)) {
            // A row listed in Discover is still valid and can be bookmarked again, so it needs no confirm.
            if (this.activeTab === 'bookmarks' && !confirmUnbookmark(computation, this.translocoService)) return
            this.removeBookmark(computation.correlation_uuid)
        } else {
            this.addBookmark(computation)
        }
    }

    copyShareLink(computation: ComputationDisplayEntity, event: Event): void {
        event.stopPropagation()
        this.shareService.copyShareLink(this.pluginId, computation.correlation_uuid)
    }

    private async addBookmark(computation: ComputationDisplayEntity): Promise<void> {
        if (this.isBookmarked(computation.correlation_uuid)) return

        const entity = toBookmarkEntity(computation)

        await this.pluginService.storeNewComputes(entity)
        this.upsertRuns([entity])
        this.pluginService.storeValidUntil(entity.correlation_uuid)
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
}
