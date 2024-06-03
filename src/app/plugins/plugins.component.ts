import {AfterViewInit, Component, OnInit} from '@angular/core'
import {Router, NavigationEnd} from '@angular/router'
import {PluginService} from '../plugin/plugin.service'
import {CommonModule} from '@angular/common'
import {MatIconModule} from '@angular/material/icon'
import {MatTooltipModule} from '@angular/material/tooltip'
import {availableCards, PluginCard} from './plugins.interface'

@Component({
    selector: 'app-plugins',
    templateUrl: './plugins.component.html',
    styleUrls: ['./plugins.component.scss'],
    imports: [
        CommonModule,
        MatIconModule,
        MatTooltipModule
    ],
    standalone: true
})
export class PluginsComponent implements AfterViewInit, OnInit {

    cards: Array<PluginCard> = availableCards
    activeCard?: PluginCard

    constructor(
        private router: Router,
        private pluginService: PluginService) {
    }

    ngAfterViewInit(): void {
        this.loadPlugins()
    }

    ngOnInit(): void {
        this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) {
                this.syncActiveCardWithRoute();
            }
        })
    }

    syncActiveCardWithRoute(): void {
        const currentUrl = this.router.url;
        const matchingCard = this.cards.find(card => `/plugin/${card.plugin_id}` === currentUrl);
        this.activeCard = matchingCard;
    }

    loadPlugins() {
        this.pluginService.getPlugins().subscribe({
            next: (data) => {
                data.forEach((plugin) => {
                    const card = availableCards.find((x) => x.plugin_id == plugin.plugin_id)
                    if (card) {
                        card.enabled = true
                        card.library_version = plugin.library_version
                        card.version = plugin.version
                        card.purpose = plugin.purpose

                        if (this.router.url == `/plugin/${card.plugin_id}`)
                            this.activeCard = card
                    }
                })
            },
            error: error => {
                console.error('Error fetching plugins:', error)
            }
        })
    }

    activateCard(card: PluginCard) {
        if (card.enabled) {
            this.router.navigate(['plugin', card.plugin_id]).then(() => {
                this.activeCard = card;
            });
        }
    }

    showPluginInfo(card: PluginCard) {
        if (card.enabled) {
            this.router.navigate(['plugin', card.plugin_id]).then(() => {
                this.activeCard = card;
            });
        }
    }
}
