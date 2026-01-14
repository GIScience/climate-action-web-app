import { CommonModule } from '@angular/common'
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { NavigationEnd, Router } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { TippyDirective } from '@ngneat/helipopper'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { MapArtifactManagerService } from '../map/map-artifact-manager.service'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { PluginCard } from './plugin-catalog.interface'

@Component({
    selector: 'app-plugin-catalog',
    templateUrl: './plugin-catalog.component.html',
    styleUrls: ['./plugin-catalog.component.scss'],
    imports: [CommonModule, MatIconModule, TippyDirective, NgScrollbarModule, TranslocoModule]
})
export class PluginCatalogComponent implements AfterViewInit, OnInit {
    private router = inject(Router)
    private pluginService = inject(PluginService)
    private artifactViewerService = inject(ArtifactViewerService)
    private mapService = inject(MapService)
    private mapArtifactManager = inject(MapArtifactManagerService)

    @ViewChild('catalogToggle', { static: true }) catalogToggle!: ElementRef<HTMLInputElement>

    cards: Array<PluginCard> = []
    activeCard?: PluginCard
    loading = true

    ngAfterViewInit(): void {
        if (this.catalogToggle) {
            this.pluginService.setCatalogToggleInput(this.catalogToggle.nativeElement)
            this.loadPlugins()
        }
    }

    ngOnInit(): void {
        this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) {
                this.sortCards()
                this.syncActiveCardWithRoute()
            }
        })
    }

    syncActiveCardWithRoute(): void {
        const currentUrl = this.router.url
        this.activeCard = this.cards.find(card => currentUrl.includes(`plugin/${card.id}`))
    }

    sortCards() {
        this.cards.sort((a, b) => {
            return a.name.localeCompare(b.name)
        })
    }

    loadPlugins() {
        this.loading = true
        this.pluginService.getPlugins().subscribe({
            next: data => {
                data.forEach(plugin => {
                    const pluginCard = {
                        id: plugin.id,
                        name: plugin.name,
                        icon: this.pluginService.getIconUrl(plugin.id),
                        library_version: plugin.library_version,
                        version: plugin.version,
                        teaser: plugin.teaser,
                        status: plugin.status || 'active'
                    } as PluginCard

                    const existingCard = this.cards.find(x => x.id === plugin.id)
                    if (existingCard) {
                        Object.assign(existingCard, pluginCard)
                    } else {
                        this.cards.push(pluginCard)
                    }
                })

                // TODO: Refactor once gateway is updated to report plugin status (https://gitlab.heigit.org/climate-action/api-gateway/-/issues/38)

                // const storedRuns = this.storageService.getComputesByStatus(['PENDING', 'STARTED', 'SUCCESS'])
                // storedRuns.forEach(run => {
                //     const existingCard = this.cards.find(x => x.id === run.pluginId)
                //     if (!existingCard) {
                //         const offlineCard = {
                //             id: run.pluginId,
                //             name: derivePluginNameFromId(run.pluginId || ''),
                //             icon: this.pluginService.getIconUrl(run.pluginId || ''),
                //             library_version: 'N/A',
                //             version: 'N/A',
                //             teaser: 'This plugin is currently offline',
                //             status: 'unavailable'
                //         } as PluginCard

                //         this.cards.push(offlineCard)
                //     }
                // })

                this.sortCards()
                this.syncActiveCardWithRoute()
                this.loading = false
            },
            error: error => {
                console.error('Error fetching plugins:', error)
                this.loading = false
            }
        })
    }

    onImageError(event: Event) {
        ;(event.target as HTMLImageElement).src = 'assets/images/plugin-icons/fallback.jpg'
    }

    showPlugin(card: PluginCard) {
        this.artifactViewerService.closeArtifactViewer()
        this.pluginService.setComputeState('inactive')
        this.mapService.removeFocusedLayer()
        this.mapService.removeComputeLayers()
        this.mapArtifactManager.clearTransientArtifacts()
        this.router.navigate(['dashboard', 'plugin', card.id]).then(() => {
            this.activeCard = card
        })
    }
}
