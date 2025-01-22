import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core'
import {NavigationEnd, Router} from '@angular/router'
import {PluginService} from '../plugin/plugin.service'
import {ArtifactService} from '../artifact/artifact.service'
import {CommonModule} from '@angular/common'
import {MatIconModule} from '@angular/material/icon'
import {availableCards, PluginCard} from './plugin-catalog.interface'
import {TippyDirective} from '@ngneat/helipopper'

@Component({
    selector: 'app-plugin-catalog',
    templateUrl: './plugin-catalog.component.html',
    styleUrls: ['./plugin-catalog.component.scss'],
    imports: [
        CommonModule,
        MatIconModule,
        TippyDirective
    ],
    standalone: true
})
export class PluginCatalogComponent implements AfterViewInit, OnInit {
    @ViewChild('catalogToggle', {static: true}) catalogToggle!: ElementRef<HTMLInputElement>

    cards: Array<PluginCard> = availableCards
    activeCard?: PluginCard

    constructor(
        private router: Router,
        private pluginService: PluginService,
        private artifactService: ArtifactService) {
    }

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
            if (a.enabled && !b.enabled) {
                return -1
            } else if (!a.enabled && b.enabled) {
                return 1
            } else {
                return a.name.localeCompare(b.name)
            }
        })
    }

    loadPlugins() {
        this.pluginService.getPlugins().subscribe({
            next: (data) => {
                data.forEach((plugin) => {

                    const pluginCard = {
                        enabled: true,
                        plugin_id: plugin.plugin_id,
                        name: plugin.name,
                        icon: this.pluginService.getIconUrl(plugin.plugin_id, plugin.version),
                        library_version: plugin.library_version,
                        version: plugin.version,
                        purpose: plugin.purpose
                    } as PluginCard

                    const existingCard = this.cards.find((x) => x.plugin_id === plugin.plugin_id)
                    if (existingCard) {
                        Object.assign(existingCard, pluginCard)
                    } else {
                        this.cards.push(pluginCard)
                    }
                })
                this.sortCards()
                this.syncActiveCardWithRoute()
            },
            error: error => {
                console.error('Error fetching plugins:', error)
            }
        })
    }

    onImageError(event: Event) {
        (event.target as HTMLImageElement).src = 'assets/images/plugin-icons/fallback.jpg'
    }

    activateCard(card: PluginCard) {
        if (card.enabled) {
            this.router.navigate(['dashboard', 'plugin', card.plugin_id]).then(() => {
                this.activeCard = card
            })
        }
    }

    showPlugin(card: PluginCard) {
        if (card.enabled) {
            this.artifactService.closeArtifact()
            this.router.navigate(['dashboard', 'plugin', card.plugin_id]).then(() => {
                this.activeCard = card
            })
        }
    }
}
