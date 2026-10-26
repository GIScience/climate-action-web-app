import { ConnectedPosition, OverlayConfig } from '@angular/cdk/overlay'
import { CommonModule } from '@angular/common'
import {
    Component,
    DestroyRef,
    ElementRef,
    Input,
    OnInit,
    QueryList,
    ViewChild,
    ViewChildren,
    inject
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router } from '@angular/router'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import {
    LucideBike,
    LucideCloudOff,
    LucideDynamicIcon,
    LucideFactory,
    LucideFootprints,
    LucideIconInput,
    LucideLeaf,
    LucideRecycle,
    LucideUmbrella
} from '@lucide/angular'
import { TippyDirective } from '@ngneat/helipopper'
import type { TippyProps } from '@ngneat/helipopper/config'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { filter, skip } from 'rxjs'
import { DropdownMenuDirective } from '../../shared/dropdown-menu.directive'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { MapArtifactManagerService } from '../map/map-artifact-manager.service'
import { MapService } from '../map/map.service'
import { Concern } from '../plugin/plugin.interface'
import { PluginService } from '../plugin/plugin.service'
import { PluginCard } from './plugin-catalog.interface'

const GRID_COLUMNS = 3

const ARROW_STEPS: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -GRID_COLUMNS,
    ArrowDown: GRID_COLUMNS
}

const DECK_POSITIONS: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 10 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -10 }
]

// Icon and colour per concern for the legend; labels live in i18n under `pluginCatalog.concerns.<concern>`
const CONCERN_STYLES: Record<Concern, { icon: LucideIconInput; color: string }> = {
    cycling: { icon: LucideBike, color: '#b23a48' },
    adaption: { icon: LucideUmbrella, color: '#2f6a9a' },
    mitigation: { icon: LucideLeaf, color: '#4a7c3f' },
    pedestrian: { icon: LucideFootprints, color: '#8a4f9e' },
    waste: { icon: LucideRecycle, color: '#5d6b75' },
    ghg_emission: { icon: LucideFactory, color: '#8a5a44' }
}

const isKnownConcern = (concern: string): concern is Concern => Object.hasOwn(CONCERN_STYLES, concern)

@Component({
    selector: 'app-plugin-catalog',
    templateUrl: './plugin-catalog.component.html',
    styleUrls: ['./plugin-catalog.component.scss'],
    imports: [
        CommonModule,
        DropdownMenuDirective,
        LucideCloudOff,
        LucideDynamicIcon,
        TippyDirective,
        NgScrollbarModule,
        TranslocoModule
    ]
})
export class PluginCatalogComponent implements OnInit {
    private router = inject(Router)
    private pluginService = inject(PluginService)
    private translocoService = inject(TranslocoService)
    private artifactViewerService = inject(ArtifactViewerService)
    private mapService = inject(MapService)
    private mapArtifactManager = inject(MapArtifactManagerService)
    private destroyRef = inject(DestroyRef)

    @Input() mode: 'deck' | 'inline' = 'inline'

    @ViewChild('deckTrigger') deckTrigger?: ElementRef<HTMLButtonElement>
    @ViewChild('panel') panel?: ElementRef<HTMLElement>
    @ViewChildren('tile') tiles?: QueryList<ElementRef<HTMLButtonElement>>

    readonly gridColumns = GRID_COLUMNS
    readonly deckPositions = DECK_POSITIONS
    readonly overlayConfig: Partial<OverlayConfig> = {
        backdropClass: 'cdk-overlay-scrim-backdrop',
        usePopover: false
    }
    readonly concernStyles = CONCERN_STYLES
    readonly teaserDelay: [number, number] = [200, 0]
    readonly teaserPopperOptions: TippyProps['popperOptions'] = {
        modifiers: [{ name: 'flip', options: { altBoundary: true } }]
    }

    cards: Array<PluginCard> = []
    activeCard?: PluginCard
    hoveredCard?: PluginCard
    concernLegend: Concern[] = []
    highlightedConcern?: Concern
    loading = true
    open = false

    get backCards(): PluginCard[] {
        return this.cards.filter(card => card !== this.activeCard).slice(0, 2)
    }

    ngOnInit(): void {
        this.loadPlugins()

        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.syncActiveCardWithRoute())

        this.translocoService.langChanges$
            .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.loadPlugins())
    }

    syncActiveCardWithRoute(): void {
        const currentUrl = this.router.url
        this.activeCard = this.cards.find(card => currentUrl.includes(`plugin/${card.id}`))
    }

    sortCards() {
        // Put online plugins first (true > false), then alphabetical by name
        this.cards.sort((a, b) =>
            a.online === b.online ? a.name.localeCompare(b.name) : (b.online ? 1 : 0) - (a.online ? 1 : 0)
        )
    }

    loadPlugins() {
        this.loading = true
        this.pluginService.getPlugins().subscribe({
            next: data => {
                data.forEach(plugin => {
                    const pluginCard: PluginCard = {
                        id: plugin.id,
                        name: plugin.name,
                        icon: this.pluginService.getIconUrl(plugin.id),
                        teaser: plugin.teaser,
                        online: plugin.online,
                        concerns: (plugin.concerns ?? []).filter(isKnownConcern)
                    }

                    const existingCard = this.cards.find(x => x.id === plugin.id)
                    if (existingCard) {
                        Object.assign(existingCard, pluginCard)
                    } else {
                        this.cards.push(pluginCard)
                    }
                })

                this.sortCards()
                this.syncActiveCardWithRoute()
                this.concernLegend = this.buildConcernLegend()
                this.loading = false
            },
            error: error => {
                console.error('Error fetching plugins:', error)
                this.loading = false
            }
        })
    }

    private buildConcernLegend(): Concern[] {
        const counts = new Map<Concern, number>()
        this.cards.forEach(card =>
            card.concerns.forEach(concern => counts.set(concern, (counts.get(concern) ?? 0) + 1))
        )
        return [...counts.entries()]
            .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
            .map(([concern]) => concern)
    }

    isConcernActive(concern: Concern): boolean {
        if (this.highlightedConcern) return this.highlightedConcern === concern
        return !!(this.hoveredCard ?? this.activeCard)?.concerns.includes(concern)
    }

    isHighlightSoftened(card: PluginCard): boolean {
        return card === this.activeCard && !!this.hoveredCard && this.hoveredCard !== card
    }

    isDimmed(card: PluginCard): boolean {
        return !!this.highlightedConcern && !card.concerns.includes(this.highlightedConcern)
    }

    onImageError(event: Event) {
        ;(event.target as HTMLImageElement).src = 'assets/images/plugin-icons/fallback.jpg'
    }

    toggle(event: MouseEvent) {
        if (this.open) {
            this.close()
            return
        }

        this.open = true
        const fromKeyboard = event.detail === 0
        setTimeout(() => (fromKeyboard ? this.focusTile(this.activeIndex) : this.panel?.nativeElement.focus()))
    }

    close(restoreFocus = false) {
        if (!this.open) return

        this.open = false
        this.hoveredCard = undefined
        this.highlightedConcern = undefined
        if (restoreFocus) {
            this.deckTrigger?.nativeElement.focus()
        }
    }

    onGridKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            this.close(true)
            return
        }

        const step = ARROW_STEPS[event.key]
        if (step === undefined || !this.tiles) return

        event.preventDefault()
        const current = this.tiles.toArray().findIndex(tile => tile.nativeElement === document.activeElement)
        this.focusTile(current === -1 ? this.activeIndex : Math.min(Math.max(current + step, 0), this.tiles.length - 1))
    }

    private get activeIndex(): number {
        return this.activeCard ? this.cards.indexOf(this.activeCard) : 0
    }

    private focusTile(index: number) {
        this.tiles?.get(index)?.nativeElement.focus()
    }

    showPlugin(card: PluginCard) {
        this.close()
        this.artifactViewerService.closeArtifactViewer()
        this.pluginService.setComputeState('inactive')
        this.mapService.removeFocusedLayer()
        this.mapService.removeComputeLayers()
        this.mapArtifactManager.clearTransientArtifacts()
        this.router.navigate(['dashboard', 'plugin', card.id])
    }
}
