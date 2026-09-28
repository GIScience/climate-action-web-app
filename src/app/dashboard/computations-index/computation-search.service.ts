import { inject, Injectable, OnDestroy, signal } from '@angular/core'
import { Subscription } from 'rxjs'
import { MapSearchManagerService } from '../map/map-search-manager.service'
import { PluginService } from '../plugin/plugin.service'
import { ComputationDisplayEntity, SearchCentroidCollection } from './computation.interface'
import { mapSearchComputation } from './computation.mapper'

@Injectable()
export class ComputationSearchService implements OnDestroy {
    private readonly pluginService = inject(PluginService)
    private readonly mapSearchManager = inject(MapSearchManagerService)

    readonly computations = signal<ComputationDisplayEntity[]>([])
    readonly loading = signal(false)
    readonly hasMore = signal(false)

    private readonly pageSize = 10
    private pluginId?: string
    private nextCursor: string | null = null
    private loaded = false
    private stale = false
    private centroids?: SearchCentroidCollection
    private pageSubscription?: Subscription
    private centroidsSubscription?: Subscription

    ensureLoaded(pluginId: string): void {
        this.switchPlugin(pluginId)
        if (this.stale) {
            this.resetPage()
        }
        if (!this.loaded) {
            this.loadPage()
        }
    }

    markStale(): void {
        this.stale = true
        this.centroids = undefined
    }

    loadMore(): void {
        // nextCursor is null both before the first page and after the last, so hasMore
        // is what gates a refetch of page one
        if (this.hasMore()) {
            this.loadPage()
        } else {
            console.warn('ComputationSearchService: loadMore called with no further pages')
        }
    }

    updateComputation(computation: ComputationDisplayEntity): void {
        this.computations.update(computations =>
            computations.map(current =>
                current.correlation_uuid === computation.correlation_uuid ? computation : current
            )
        )
    }

    showSearchLayers(pluginId: string): void {
        this.switchPlugin(pluginId)

        if (this.centroids) {
            this.mapSearchManager.showSearchLayers(pluginId, this.centroids)
            return
        }

        // A fetch is already in flight; it will show the search state when it lands
        if (this.centroidsSubscription?.closed === false) return

        this.centroidsSubscription = this.pluginService.getSearchCentroids(pluginId).subscribe({
            next: centroids => {
                this.centroids = centroids
                this.mapSearchManager.showSearchLayers(pluginId, centroids)
            },
            error: error => console.error('Error loading search centroids:', error)
        })
    }

    hideSearchLayers(): void {
        this.centroidsSubscription?.unsubscribe()
        this.mapSearchManager.hideSearchLayers()
    }

    ngOnDestroy(): void {
        this.pageSubscription?.unsubscribe()
        this.centroidsSubscription?.unsubscribe()
        this.mapSearchManager.clearSearchLayers()
    }

    private switchPlugin(pluginId: string): void {
        if (this.pluginId === pluginId) return

        this.centroidsSubscription?.unsubscribe()
        this.pluginId = pluginId
        this.centroids = undefined
        this.resetPage()
    }

    private resetPage(): void {
        this.pageSubscription?.unsubscribe()
        this.nextCursor = null
        this.loaded = false
        this.stale = false
        this.computations.set([])
        this.hasMore.set(false)
        this.loading.set(false)
    }

    private loadPage(): void {
        if (!this.pluginId || this.loading()) return

        this.loading.set(true)
        this.pageSubscription = this.pluginService.getSearch(this.pluginId, this.nextCursor, this.pageSize).subscribe({
            next: page => {
                const existingIds = new Set(this.computations().map(computation => computation.correlation_uuid))
                const additions = page.items
                    .filter(entry => !existingIds.has(entry.correlation_uuid))
                    .map(mapSearchComputation)

                this.computations.update(computations => [...computations, ...additions])
                this.nextCursor = page.next_page
                this.hasMore.set(page.next_page !== null)
                this.loaded = true
                this.loading.set(false)
            },
            error: () => this.loading.set(false)
        })
    }
}
