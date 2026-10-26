import { Injectable, Injector, inject } from '@angular/core'
import { SupportedLanguage, isValidLanguage } from '@app/types/language.types'
import { TranslocoService } from '@jsverse/transloco'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, Observable, take } from 'rxjs'
import { AppwriteService } from './auth/appwrite.service'
import { isRealUser } from './auth/user.utils'
import { statusRank } from './dashboard/common/status-rank.util'
import { ComputationFlags, ComputationRunState } from './dashboard/common/status.types'
import { ComputationDatabaseEntity, DiscoverTab } from './dashboard/computations-index/computation.interface'
import { AppwriteDbService, PaginatedResult } from './persistence/appwrite-db.service'
import { RunSyncService } from './persistence/run-sync.service'
import { RunsDbService } from './persistence/runs-db.service'

interface MapPreferences {
    selectedLayer?: string
    layerSwitcherCollapsed?: boolean
}

interface UiPreferences {
    activeTab?: DiscoverTab
}

// Central service for all storage operations.
// Runs are saved locally first: the in-memory list is what the app reads,
// IndexedDB keeps a copy that survives reloads, and RunSyncService sends
// each change to Appwrite in the background.
// User preferences stay in localStorage.
@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private appwriteService = inject(AppwriteService)
    private appwriteDb = inject(AppwriteDbService)
    private runsDb = inject(RunsDbService)
    private runSync = inject(RunSyncService)
    private translocoService = inject(TranslocoService)
    private injector = inject(Injector)

    private readonly STORAGE_KEYS = {
        MAP_PREFERENCES: 'map_prefs',
        UI_PREFERENCES: 'ui_prefs',
        LANGUAGE_PREFERENCE: 'language_pref',
        TOUR_AFTER_LOGIN: 'start_tour_after_login',
        RUNS_WIPE_PENDING: 'runs_wipe_pending',
        RUNS_OWNER: 'runs_owner'
    }

    private pluginRunsSubject = new BehaviorSubject<ComputationDatabaseEntity[]>([])

    private paginationState: { [pluginId: string]: { cursor?: string; hasMore: boolean } } = {}
    private readonly DEFAULT_PAGE_SIZE = 10

    // Resolves once runs have been loaded from IndexedDB (or loading failed).
    readonly ready: Promise<void>

    constructor() {
        this.appwriteService.onLogout.subscribe(() => {
            // The page reload after logout can cut the wipe below short,
            // so set a flag to finish it on the next startup.
            this.setItem(this.STORAGE_KEYS.RUNS_WIPE_PENDING, true)
            localStorage.removeItem(this.STORAGE_KEYS.RUNS_OWNER)
            void this.runsDb.clearAll()
            this.pluginRunsSubject.next([])
        })
        // Try to upload pending changes while the session is still valid.
        this.appwriteService.registerBeforeLogout(() => this.runSync.drainNow())

        this.ready = this.hydrate()

        // Remember which user the local data belongs to. If a different user
        // logs in (e.g. after the previous session expired without a logout),
        // wipe it so it is not uploaded to the wrong account.
        this.appwriteService._user.subscribe(async user => {
            if (!isRealUser(user)) return

            const previousOwner = this.getItem<string | null>(this.STORAGE_KEYS.RUNS_OWNER, null)
            this.setItem(this.STORAGE_KEYS.RUNS_OWNER, user.$id)
            if (previousOwner && previousOwner !== user.$id) {
                await this.ready
                this.pluginRunsSubject.next([])
                await this.runsDb.clearAll()
            }
        })
    }

    // Loads the persisted runs into memory, after finishing any cleanup
    // that must happen first.
    private async hydrate(): Promise<void> {
        try {
            // Runs used to live in localStorage. That old copy is removed, not migrated.
            // TODO: Consider dropping this cleanup later
            localStorage.removeItem('plugin_runs')
            // A presence flag: set at logout, removed once the wipe has finished
            if (localStorage.getItem(this.STORAGE_KEYS.RUNS_WIPE_PENDING) !== null) {
                await this.runsDb.clearAll()
                localStorage.removeItem(this.STORAGE_KEYS.RUNS_WIPE_PENDING)
            }
            this.pluginRunsSubject.next(await this.runsDb.getAllRuns())
            this.runSync.scheduleDrain()
        } catch (error) {
            console.error('IndexedDB unavailable, runs will not be persisted on this device:', error)
            // Deferred because ToastrService needs ApplicationRef
            setTimeout(() => this.notifyPersistenceUnavailable())
        }
    }

    private notifyPersistenceUnavailable(): void {
        const toastr = this.injector.get(ToastrService)
        this.translocoService
            .selectTranslate('app.storageUnavailable')
            .pipe(take(1))
            .subscribe(message => toastr.error(message))
    }

    private realOnlineUser(): boolean {
        return isRealUser(this.appwriteService._user.getValue())
    }

    // Pagination

    async getPluginRunsPaginated(
        pluginId: string,
        isInitialLoad: boolean = true
    ): Promise<PaginatedResult<ComputationDatabaseEntity>> {
        if (!this.realOnlineUser()) {
            // Anonymous and dev/fake users are served entirely from local data
            return { documents: this.filterLocalRuns(pluginId), hasMore: false }
        }

        const currentState = this.paginationState[pluginId] || { hasMore: true }

        if (!isInitialLoad && !currentState.hasMore) {
            return { documents: [], hasMore: false }
        }

        const cursor = isInitialLoad ? undefined : currentState.cursor

        try {
            // This fetch does not throw on an Appwrite error: it returns an
            // empty page, and the merge below then changes nothing.
            const result = await this.appwriteDb.fetchPluginRunsPaginated({
                limit: this.DEFAULT_PAGE_SIZE,
                cursor,
                pluginId
            })

            this.paginationState[pluginId] = {
                cursor: result.nextCursor,
                hasMore: result.hasMore
            }

            result.documents = await this.mergeServerRuns(result.documents)

            return result
        } catch (error) {
            console.error('Error loading paginated runs from Appwrite, falling back to local data:', error)
            return { documents: this.filterLocalRuns(pluginId), hasMore: false }
        }
    }

    private filterLocalRuns(pluginId: string): ComputationDatabaseEntity[] {
        return this.getPluginRuns()
            .filter(run => run.pluginId === pluginId)
            .sort((a, b) => new Date(b.request_ts).getTime() - new Date(a.request_ts).getTime())
    }

    // Merges a page of runs from the server into the local runs, instead of
    // replacing them:
    // - local runs that are not on the page are kept (e.g. created while logged out)
    // - a run with a pending upsert keeps its local version
    // - a run with a pending delete is skipped, so it does not reappear
    // Returns the page's runs as they look after the merge.
    private async mergeServerRuns(serverDocs: ComputationDatabaseEntity[]): Promise<ComputationDatabaseEntity[]> {
        const { upserts, deletes } = await this.runsDb.getPendingOpUuids()
        // A Map keeps insertion order: existing runs stay in place, new ones go to the end
        const runsById = new Map(this.getPluginRuns().map(run => [run.correlation_uuid, run]))
        const pageDocs: ComputationDatabaseEntity[] = []

        for (const doc of serverDocs) {
            if (deletes.has(doc.correlation_uuid)) continue

            const local = runsById.get(doc.correlation_uuid)
            const merged = this.mergeDoc(local, doc, upserts.has(doc.correlation_uuid))
            runsById.set(doc.correlation_uuid, merged)
            pageDocs.push(merged)
        }

        this.pluginRunsSubject.next([...runsById.values()])
        await this.runsDb.putRuns(pageDocs)
        return pageDocs
    }

    // Compare server document against its local counterpart.
    private mergeDoc(
        local: ComputationDatabaseEntity | undefined,
        doc: ComputationDatabaseEntity,
        hasPendingUpsert: boolean
    ): ComputationDatabaseEntity {
        if (!local) return doc
        // The local change is not uploaded yet, so the server copy is outdated
        if (hasPendingUpsert) return local
        // Replace local copy only if the status rank is higher
        const status = statusRank(doc.status) >= statusRank(local.status) ? doc.status : local.status
        return { ...local, ...doc, status }
    }

    resetPagination(pluginId: string): void {
        delete this.paginationState[pluginId]
    }

    // Storage utility methods

    private getItem<T>(key: string, defaultValue: T): T {
        const data = localStorage.getItem(key)
        return data ? JSON.parse(data) : defaultValue
    }

    private setItem<T>(key: string, value: T): void {
        localStorage.setItem(key, JSON.stringify(value))
    }

    // Plugin runs

    getPluginRunsObservable(): Observable<ComputationDatabaseEntity[]> {
        return this.pluginRunsSubject.asObservable()
    }

    getPluginRuns(): ComputationDatabaseEntity[] {
        return this.pluginRunsSubject.getValue()
    }

    async storeNewCompute(compute: ComputationDatabaseEntity): Promise<void> {
        const others = this.getPluginRuns().filter(run => run.correlation_uuid !== compute.correlation_uuid)
        this.pluginRunsSubject.next([...others, compute])
        // commit persists the run and the outbox entry in one transaction
        await this.runSync.commit({ op: 'upsert', correlation_uuid: compute.correlation_uuid, payload: compute })
        if (compute.pluginId) {
            this.resetPagination(compute.pluginId)
        }
    }

    async deleteComputation(correlationId: string): Promise<void> {
        this.pluginRunsSubject.next(this.getPluginRuns().filter(run => run.correlation_uuid !== correlationId))
        // While this delete is pending, mergeServerRuns skips the run,
        // so a server page cannot bring it back
        await this.runSync.commit({ op: 'delete', correlation_uuid: correlationId })
    }

    getComputesByStatus(statuses: ComputationRunState[]): ComputationDatabaseEntity[] {
        return this.getPluginRuns().filter(run => statuses.includes(run.status as ComputationRunState))
    }

    async markAsNew(correlationId: string): Promise<void> {
        await this.setFlag(correlationId, 'NEW', true)
    }

    async markAsViewed(correlationId: string): Promise<void> {
        await this.setFlag(correlationId, 'NEW', false)
    }

    // Adds or removes a flag, skipping the write when nothing would change
    private async setFlag(correlationId: string, flag: ComputationFlags[number], present: boolean): Promise<void> {
        const run = this.getPluginRuns().find(r => r.correlation_uuid === correlationId)
        if (!run) return

        const flags = run.flags ?? []
        if (flags.includes(flag) === present) return
        await this.updateComputation(correlationId, {
            flags: present ? [...flags, flag] : flags.filter(f => f !== flag)
        })
    }

    // Helper method for updating computation properties

    async updateComputation(correlationId: string, updates: Partial<ComputationDatabaseEntity>): Promise<void> {
        const existing = this.getPluginRuns().find(run => run.correlation_uuid === correlationId)
        if (!existing) return

        const merged = { ...existing, ...updates }
        this.pluginRunsSubject.next(this.getPluginRuns().map(run => (run === existing ? merged : run)))
        // Queue the full run, not just the changed fields: this change may replace
        // an earlier one for the same run, and may have to create the document
        await this.runSync.commit({ op: 'upsert', correlation_uuid: correlationId, payload: merged })
    }

    // Map preferences

    private getMapPreferences(): MapPreferences {
        return this.getItem<MapPreferences>(this.STORAGE_KEYS.MAP_PREFERENCES, {})
    }

    private saveMapPreferences(prefs: MapPreferences): void {
        this.setItem(this.STORAGE_KEYS.MAP_PREFERENCES, prefs)
    }

    getSelectedMapLayer(defaultLayer: string): string {
        const prefs = this.getMapPreferences()
        return prefs.selectedLayer || defaultLayer
    }

    saveSelectedMapLayer(layerName: string): void {
        const prefs = this.getMapPreferences()
        prefs.selectedLayer = layerName
        this.saveMapPreferences(prefs)
    }

    getLayerSwitcherCollapsed(): boolean {
        const prefs = this.getMapPreferences()
        return prefs.layerSwitcherCollapsed === undefined ? false : prefs.layerSwitcherCollapsed
    }

    saveLayerSwitcherCollapsed(isCollapsed: boolean): void {
        const prefs = this.getMapPreferences()
        prefs.layerSwitcherCollapsed = isCollapsed
        this.saveMapPreferences(prefs)
    }

    // UI preferences

    private getUiPreferences(): UiPreferences {
        return this.getItem<UiPreferences>(this.STORAGE_KEYS.UI_PREFERENCES, {})
    }

    private saveUiPreferences(prefs: UiPreferences): void {
        this.setItem(this.STORAGE_KEYS.UI_PREFERENCES, prefs)
    }

    getActiveTab(defaultTab: DiscoverTab): DiscoverTab {
        const prefs = this.getUiPreferences()
        return prefs.activeTab || defaultTab
    }

    saveActiveTab(tab: DiscoverTab): void {
        const prefs = this.getUiPreferences()
        prefs.activeTab = tab
        this.saveUiPreferences(prefs)
    }

    // Landing page data

    async getTotalComputationsCount(): Promise<number> {
        await this.appwriteService.tryToLogin()

        if (!this.realOnlineUser()) {
            return this.getPluginRuns().length
        }

        try {
            return await this.appwriteDb.getTotalComputationsCount()
        } catch (error) {
            console.error('Error getting total computations count from Appwrite.', error)
            return 0
        }
    }

    async getLatestComputation(): Promise<ComputationDatabaseEntity | null> {
        await this.appwriteService.tryToLogin()

        if (!this.realOnlineUser()) {
            const activeComputations = [...this.getPluginRuns()].sort(
                (a, b) => new Date(b.request_ts).getTime() - new Date(a.request_ts).getTime()
            )

            return activeComputations.length > 0 ? activeComputations[0] : null
        }

        try {
            return await this.appwriteDb.getLatestComputation()
        } catch (error) {
            console.error('Error getting latest computation from Appwrite.', error)
            return null
        }
    }

    // Tour preferences

    getPendingTourState(): boolean {
        return this.getItem(this.STORAGE_KEYS.TOUR_AFTER_LOGIN, false)
    }

    setTourAfterLoginFlag(shouldStart: boolean): void {
        this.setItem(this.STORAGE_KEYS.TOUR_AFTER_LOGIN, shouldStart)
    }

    clearTourAfterLoginFlag(): void {
        this.setItem(this.STORAGE_KEYS.TOUR_AFTER_LOGIN, false)
    }

    // Language preferences

    getLanguagePreference(): SupportedLanguage | null {
        const savedLang = this.getItem<string | null>(this.STORAGE_KEYS.LANGUAGE_PREFERENCE, null)
        return savedLang && isValidLanguage(savedLang) ? savedLang : null
    }

    saveLanguagePreference(language: SupportedLanguage): void {
        this.setItem(this.STORAGE_KEYS.LANGUAGE_PREFERENCE, language)
    }
}
