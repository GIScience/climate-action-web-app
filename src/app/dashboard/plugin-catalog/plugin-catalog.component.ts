import { CommonModule } from '@angular/common'
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { NavigationEnd, Router } from '@angular/router'
import { TippyDirective } from '@ngneat/helipopper'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { ArtifactService } from '../artifact/artifact.service'
import { PluginService } from '../plugin/plugin.service'
import { PluginCard } from './plugin-catalog.interface'

@Component({
    selector: 'app-plugin-catalog',
    templateUrl: './plugin-catalog.component.html',
    styleUrls: ['./plugin-catalog.component.scss'],
    imports: [CommonModule, MatIconModule, TippyDirective, NgScrollbarModule],
    standalone: true
})
export class PluginCatalogComponent implements AfterViewInit, OnInit {
    @ViewChild('catalogToggle', { static: true }) catalogToggle!: ElementRef<HTMLInputElement>

    cards: Array<PluginCard> = []
    activeCard?: PluginCard
    loading = true

    constructor(
        private router: Router,
        private pluginService: PluginService,
        private artifactService: ArtifactService
    ) {}

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
        const matchingCard = this.cards.find(card => currentUrl.includes(`plugin/${card.plugin_id}`))
        this.activeCard = matchingCard
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
                        plugin_id: plugin.plugin_id,
                        name: plugin.name,
                        icon: this.pluginService.getIconUrl(plugin.plugin_id, plugin.version),
                        library_version: plugin.library_version,
                        version: plugin.version,
                        purpose: plugin.purpose,
                        status: plugin.status || 'active'
                    } as PluginCard

                    const existingCard = this.cards.find(x => x.plugin_id === plugin.plugin_id)
                    if (existingCard) {
                        Object.assign(existingCard, pluginCard)
                    } else {
                        this.cards.push(pluginCard)
                    }
                })

                const storedRuns = this.pluginService.getComputesFromLS(['PENDING', 'STARTED', 'SUCCESS'])
                storedRuns.forEach(run => {
                    const existingCard = this.cards.find(x => x.plugin_id === run.pluginId)
                    if (!existingCard) {
                        const offlineCard = {
                            plugin_id: run.pluginId,
                            name: run.pluginName,
                            icon: this.pluginService.getIconUrl(run.pluginId || '', 'N/A'),
                            library_version: 'N/A',
                            version: 'N/A',
                            purpose: 'This plugin is currently offline',
                            status: 'unavailable'
                        } as PluginCard

                        this.cards.push(offlineCard)
                    }
                })

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

    activateCard(card: PluginCard) {
        this.router.navigate(['dashboard', 'plugin', card.plugin_id]).then(() => {
            this.activeCard = card
        })
    }

    showPlugin(card: PluginCard) {
        this.artifactService.closeArtifact()
        this.router.navigate(['dashboard', 'plugin', card.plugin_id]).then(() => {
            this.activeCard = card
        })
    }
}
