import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'
import { AppwriteService } from './auth/appwrite.service'
import { ActiveArtifactRef } from './dashboard/artifact/artifact.interface'
import { ComputationState } from './dashboard/common/status.types'
import { ComputationDatabaseEntity } from './dashboard/computations-index/computation.interface'
import { DatabaseService } from './database.service'

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
    private readonly STORAGE_KEYS = {
        PLUGIN_RUNS: 'plugin_runs',
        ACTIVE_ARTIFACT: 'active_artifact',
        MAP_PREFERENCES: 'map_prefs'
    }

    private pluginRunsSubject = new BehaviorSubject<ComputationDatabaseEntity[]>([])
    private syncInProgress = false

    constructor(
        private appwriteService: AppwriteService,
        private databaseService: DatabaseService
    ) {
        this.loadInitialData()

        this.appwriteService._user.subscribe(user => {
            if (user) {
                this.syncWithAppwrite()
            }
        })

        this.appwriteService.onLogout.subscribe(() => {
            this.savePluginRunsToLocal([])
            this.pluginRunsSubject.next([])
        })
    }

    private async loadInitialData(): Promise<void> {
        const pluginRuns = this.getPluginRunsFromLocal()
        this.pluginRunsSubject.next(pluginRuns)
    }

    private async syncWithAppwrite(): Promise<void> {
        if (this.syncInProgress) return

        this.syncInProgress = true
        try {
            const initialSyncStatus = sessionStorage.getItem('initialSyncCompleted')

            const localRuns = this.getPluginRunsFromLocal()
            await this.databaseService.syncPluginRuns(localRuns)

            const appwriteRuns = await this.databaseService.getPluginRuns()

            const mergedRuns = this.mergeRuns(localRuns, appwriteRuns)

            this.savePluginRunsToLocal(mergedRuns)
            this.pluginRunsSubject.next(mergedRuns)

            if (!initialSyncStatus) {
                sessionStorage.setItem('initialSyncCompleted', 'true')
                window.location.reload()
            }
        } catch (error) {
            console.error('Error syncing with Appwrite:', error)
        } finally {
            this.syncInProgress = false
        }
    }

    private mergeRuns(
        localRuns: ComputationDatabaseEntity[],
        appwriteRuns: ComputationDatabaseEntity[]
    ): ComputationDatabaseEntity[] {
        const runMap = new Map<string, ComputationDatabaseEntity>()

        localRuns.forEach(run => runMap.set(run.correlation_uuid, run))

        appwriteRuns.forEach(run => runMap.set(run.correlation_uuid, run))

        return Array.from(runMap.values())
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

    private getPluginRunsFromLocal(): ComputationDatabaseEntity[] {
        return this.getItem(this.STORAGE_KEYS.PLUGIN_RUNS, [])
    }

    private savePluginRunsToLocal(runs: ComputationDatabaseEntity[]): void {
        this.setItem(this.STORAGE_KEYS.PLUGIN_RUNS, runs)
    }

    async savePluginRuns(runs: ComputationDatabaseEntity[]): Promise<void> {
        this.savePluginRunsToLocal(runs)
        this.pluginRunsSubject.next(runs)

        if (this.appwriteService._user.getValue()) {
            await this.databaseService.syncPluginRuns(runs)
        }
    }

    async storeNewCompute(compute: ComputationDatabaseEntity): Promise<void> {
        const runs = this.getPluginRuns()
        runs.push(compute)

        this.savePluginRunsToLocal(runs)
        this.pluginRunsSubject.next(runs)

        if (this.appwriteService._user.getValue()) {
            await this.databaseService.createPluginRun(compute)
        }
    }

    async updateComputeStatus(correlationId: string, newStatus: ComputationState): Promise<void> {
        await this.updateComputation(correlationId, { status: newStatus })
    }

    getComputesByStatus(statuses: ComputationState[]): ComputationDatabaseEntity[] {
        return this.getPluginRuns().filter(
            run => statuses.includes(run.status as ComputationState) && run.flag !== 'ARCHIVED'
        )
    }

    // Archived runs

    getArchivedRuns(): ComputationDatabaseEntity[] {
        return this.getPluginRuns().filter(run => run.flag === 'ARCHIVED')
    }

    async archiveComputation(correlationId: string): Promise<void> {
        await this.updateComputation(correlationId, { flag: 'ARCHIVED' })
    }

    async unarchiveComputation(correlationId: string): Promise<void> {
        await this.updateComputation(correlationId, { flag: null })
    }

    // New runs tracking

    getNewRuns(): string[] {
        return this.getPluginRuns()
            .filter(run => run.flag === 'NEW')
            .map(run => run.correlation_uuid)
    }

    async markAsNew(correlationId: string): Promise<void> {
        await this.updateComputation(correlationId, { flag: 'NEW' })
    }

    async markAsViewed(correlationId: string): Promise<void> {
        await this.updateComputation(correlationId, { flag: null })
    }

    // Helper method for updating computation properties
    private async updateComputation(correlationId: string, updates: Partial<ComputationDatabaseEntity>): Promise<void> {
        const runs = this.getPluginRuns()
        const index = runs.findIndex(run => run.correlation_uuid === correlationId)

        if (index !== -1) {
            runs[index] = { ...runs[index], ...updates }
            this.savePluginRunsToLocal(runs)
            this.pluginRunsSubject.next(runs)
        }

        if (this.appwriteService._user.getValue()) {
            await this.databaseService.updatePluginRun(correlationId, updates)
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
}
