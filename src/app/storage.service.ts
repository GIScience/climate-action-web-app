import { Injectable, inject } from '@angular/core'
import { SupportedLanguage, isValidLanguage } from '@app/types/language.types'
import { Models } from 'appwrite'
import { BehaviorSubject, Observable } from 'rxjs'
import { AppwriteService } from './auth/appwrite.service'
import { ActiveArtifactRef } from './dashboard/artifact/artifact.interface'
import { ComputationFlags, ComputationItemState, ComputationRunState } from './dashboard/common/status.types'
import { ComputationDatabaseEntity } from './dashboard/computations-index/computation.interface'
import { DatabaseService, PaginatedResult } from './database.service'

interface MapPreferences {
    selectedLayer?: string
    layerSwitcherCollapsed?: boolean
}

/**
 * Central service for all storage operations
 * Uses both localStorage and Appwrite database
 * - localStorage provides offline capability and fast initial load
 * - Appwrite provides cloud sync across devices
 */
@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private appwriteService = inject(AppwriteService)
    private databaseService = inject(DatabaseService)

    private readonly STORAGE_KEYS = {
        PLUGIN_RUNS: 'plugin_runs',
        ACTIVE_ARTIFACT: 'active_artifact',
        MAP_PREFERENCES: 'map_prefs',
        LANGUAGE_PREFERENCE: 'language_pref',
        TOUR_AFTER_LOGIN: 'start_tour_after_login'
    }

    private pluginRunsSubject = new BehaviorSubject<ComputationDatabaseEntity[]>([])

    private paginationState: { [pluginId: string]: { cursor?: string; hasMore: boolean } } = {}
    private readonly DEFAULT_PAGE_SIZE = 10

    constructor() {
        this.appwriteService.onLogout.subscribe(() => {
            this.savePluginRunsToLocal([])
            this.pluginRunsSubject.next([])
        })
    }

    private getUserAuthStatus(): { user: Models.User<Models.Preferences> | null; isRealUser: boolean } {
        const user = this.appwriteService._user.getValue()
        const isRealUser = !!(user && user.$id !== 'fake-user-id')
        return { user, isRealUser }
    }

    // Pagination

    async getPluginRunsPaginated(
        pluginId: string,
        isInitialLoad: boolean = true,
        state: ComputationItemState = 'ACTIVE'
    ): Promise<PaginatedResult<ComputationDatabaseEntity>> {
        const { isRealUser } = this.getUserAuthStatus()

        if (!isRealUser) {
            // localStorage fallback for dev/fake users - filter by state locally
            const pluginRuns = this.getPluginRunsFromLocal()
            this.pluginRunsSubject.next(pluginRuns)
            const localRuns = this.getPluginRuns().filter(
                run => run.pluginId === pluginId && (run.state || 'ACTIVE') === state
            )
            return {
                documents: localRuns,
                total: localRuns.length,
                hasMore: false
            }
        }

        const currentState = this.paginationState[pluginId] || { hasMore: true }

        if (!isInitialLoad && !currentState.hasMore) {
            return { documents: [], total: 0, hasMore: false }
        }

        const cursor = isInitialLoad ? undefined : currentState.cursor

        try {
            const result = await this.databaseService.fetchPluginRunsPaginated({
                limit: this.DEFAULT_PAGE_SIZE,
                cursor,
                pluginId,
                state
            })

            this.paginationState[pluginId] = {
                cursor: result.nextCursor,
                hasMore: result.hasMore
            }

            if (isInitialLoad) {
                // First page - replace all localStorage with this plugin's runs
                this.savePluginRunsToLocal(result.documents)
                this.pluginRunsSubject.next(result.documents)
            } else {
                // Load more - append to existing runs for this plugin
                const currentRuns = this.getPluginRuns()
                const updatedRuns = [...currentRuns, ...result.documents]
                this.savePluginRunsToLocal(updatedRuns)
                this.pluginRunsSubject.next(updatedRuns)
            }

            return result
        } catch (error) {
            console.error('Error loading paginated runs from Appwrite, falling back to localStorage:', error)
            // On error, fallback to localStorage - filter by state
            const localRuns = this.getPluginRuns().filter(
                run => run.pluginId === pluginId && (run.state || 'ACTIVE') === state
            )
            return {
                documents: localRuns,
                total: localRuns.length,
                hasMore: false
            }
        }
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
        const { isRealUser } = this.getUserAuthStatus()

        if (isRealUser) {
            try {
                const appwriteId = await this.databaseService.createPluginRun(compute)
                if (appwriteId && compute.pluginId) {
                    this.resetPagination(compute.pluginId)
                }
            } catch (error) {
                console.warn('Failed to store to Appwrite, will store locally only:', error)
            }
        }

        this.addComputeToLocalStorage(compute)
    }

    getComputesByStatus(statuses: ComputationRunState[]): ComputationDatabaseEntity[] {
        return this.getPluginRuns().filter(
            run => statuses.includes(run.status as ComputationRunState) && (run.state || 'ACTIVE') === 'ACTIVE'
        )
    }

    // Archived runs

    async archiveComputation(correlationId: string): Promise<void> {
        await this.updateComputation(correlationId, { state: 'ARCHIVED' })
    }

    async unarchiveComputation(correlationId: string): Promise<void> {
        await this.updateComputation(correlationId, { state: 'ACTIVE' })
    }

    // Delete runs

    async deleteComputation(correlationId: string): Promise<void> {
        await this.updateComputation(correlationId, { state: 'DELETED' })
    }

    // New runs tracking

    getNewRuns(): string[] {
        return this.getPluginRuns()
            .filter(run => run.flags?.includes('NEW'))
            .map(run => run.correlation_uuid)
    }

    async markAsNew(correlationId: string): Promise<void> {
        await this.addFlag(correlationId, 'NEW')
    }

    async markAsViewed(correlationId: string): Promise<void> {
        await this.removeFlag(correlationId, 'NEW')
    }

    // Demo runs tracking

    getDemoRuns(pluginId: string): string[] {
        return this.getPluginRuns()
            .filter(run => run.flags?.includes('DEMO') && run.pluginId === pluginId)
            .map(run => run.correlation_uuid)
    }

    // Helper method for updating computation properties

    async updateComputation(correlationId: string, updates: Partial<ComputationDatabaseEntity>): Promise<void> {
        const { isRealUser } = this.getUserAuthStatus()

        if (isRealUser) {
            try {
                await this.databaseService.updatePluginRun(correlationId, updates)
            } catch (error) {
                console.warn('Failed to update in Appwrite, will update locally only:', error)
            }
        }

        this.updateLocalRun(correlationId, updates)
    }

    private updateLocalRun(correlationId: string, updates: Partial<ComputationDatabaseEntity>): void {
        const runs = this.getPluginRuns()
        const index = runs.findIndex(run => run.correlation_uuid === correlationId)
        if (index !== -1) {
            runs[index] = { ...runs[index], ...updates }
            this.syncLocalStorage(runs)
        }
    }

    // Helper methods to add and sync runs to localStorage

    private addComputeToLocalStorage(compute: ComputationDatabaseEntity): void {
        const runs = this.getPluginRuns()
        runs.push(compute)
        this.syncLocalStorage(runs)
    }

    private syncLocalStorage(runs: ComputationDatabaseEntity[]): void {
        this.savePluginRunsToLocal(runs)
        this.pluginRunsSubject.next(runs)
    }

    private getPluginRunsFromLocal(): ComputationDatabaseEntity[] {
        return this.getItem(this.STORAGE_KEYS.PLUGIN_RUNS, [])
    }

    private savePluginRunsToLocal(runs: ComputationDatabaseEntity[]): void {
        this.setItem(this.STORAGE_KEYS.PLUGIN_RUNS, runs)
    }

    // Helper methods for flags

    private getCurrentFlags(run: ComputationDatabaseEntity): ComputationFlags {
        return run.flags || []
    }

    private async addFlag(correlationId: string, flagToAdd: ComputationFlags[number]): Promise<void> {
        const runs = this.getPluginRuns()
        const run = runs.find(r => r.correlation_uuid === correlationId)
        if (run) {
            const currentFlags = this.getCurrentFlags(run)
            if (!currentFlags.includes(flagToAdd)) {
                await this.updateComputation(correlationId, { flags: [...currentFlags, flagToAdd] })
            }
        }
    }

    private async removeFlag(correlationId: string, flagToRemove: ComputationFlags[number]): Promise<void> {
        const runs = this.getPluginRuns()
        const run = runs.find(r => r.correlation_uuid === correlationId)
        if (run) {
            const currentFlags = this.getCurrentFlags(run)
            await this.updateComputation(correlationId, { flags: currentFlags.filter(f => f !== flagToRemove) })
        }
    }

    // Active artifact

    getActiveArtifact(): ActiveArtifactRef | null {
        return this.getItem(this.STORAGE_KEYS.ACTIVE_ARTIFACT, null)
    }

    saveActiveArtifact(artifact: ActiveArtifactRef): void {
        this.setItem(this.STORAGE_KEYS.ACTIVE_ARTIFACT, artifact)
    }

    clearActiveArtifact(): void {
        this.setItem(this.STORAGE_KEYS.ACTIVE_ARTIFACT, [])
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

    // Landing page data

    async getTotalActiveComputationsCount(): Promise<number> {
        await this.appwriteService.tryToLogin()

        const { isRealUser } = this.getUserAuthStatus()

        if (!isRealUser) {
            return this.getPluginRuns().filter(run => (run.state || 'ACTIVE') === 'ACTIVE').length
        }

        try {
            return await this.databaseService.getTotalActiveComputationsCount()
        } catch (error) {
            console.error('Error getting total active computations count from Appwrite.', error)
            return 0
        }
    }

    async getLatestActiveComputation(): Promise<ComputationDatabaseEntity | null> {
        await this.appwriteService.tryToLogin()

        const { isRealUser } = this.getUserAuthStatus()

        if (!isRealUser) {
            const activeComputations = this.getPluginRuns()
                .filter(run => (run.state || 'ACTIVE') === 'ACTIVE')
                .sort((a, b) => new Date(b.request_ts).getTime() - new Date(a.request_ts).getTime())

            return activeComputations.length > 0 ? activeComputations[0] : null
        }

        try {
            return await this.databaseService.getLatestActiveComputation()
        } catch (error) {
            console.error('Error getting latest active computation from Appwrite.', error)
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
