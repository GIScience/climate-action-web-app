import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core'
import { RouterModule } from '@angular/router'
import { getDateFnsLocale } from '@app/utils/locale.utils'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import {
    LucideBuilding,
    LucideCornerDownLeft,
    LucideDynamicIcon,
    LucideGraduationCap,
    LucideHourglass,
    LucideIconInput,
    LucideRefreshCw
} from '@lucide/angular'
import { formatDistanceToNow } from 'date-fns'
import { firstValueFrom } from 'rxjs'
import { StorageService } from '../../storage.service'
import { SearchEntry } from '../computations-index/computation.interface'
import { MapService } from '../map/map.service'
import { PluginCatalogComponent } from '../plugin-catalog/plugin-catalog.component'
import { PluginService } from '../plugin/plugin.service'
import { computationRouteCommands } from '../share/share.service'
import { TourEngine } from '../walkthrough/tour-engine.service'

const DISCOVERY_COUNT = 3

let cachedDiscoveries: SearchEntry[] = []

@Component({
    selector: 'app-landing',
    imports: [CommonModule, RouterModule, LucideDynamicIcon, PluginCatalogComponent, TranslocoModule],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
    private storageService = inject(StorageService)
    private translocoService = inject(TranslocoService)
    private cdr = inject(ChangeDetectorRef)
    private tourEngine = inject(TourEngine)
    protected pluginService = inject(PluginService)
    protected mapService = inject(MapService)

    readonly enterIcon = LucideCornerDownLeft

    readonly notes: { key: string; icon: LucideIconInput }[] = [
        { key: 'onDemand', icon: LucideHourglass },
        { key: 'urbanAreas', icon: LucideBuilding },
        { key: 'experts', icon: LucideGraduationCap },
        { key: 'worksInProgress', icon: LucideRefreshCw }
    ]

    discoveries = cachedDiscoveries
    loading = this.discoveries.length === 0

    get isRevisit(): boolean {
        return this.discoveries.length > 0
    }

    async ngOnInit() {
        try {
            await this.storageService.ready
            if (this.storageService.getPluginRuns().length === 0) return

            const page = await firstValueFrom(this.pluginService.getSearch(undefined, null, DISCOVERY_COUNT))
            this.discoveries = cachedDiscoveries = page.items
        } catch (error) {
            console.error('Error loading discoveries:', error)
        } finally {
            this.loading = false
            this.cdr.detectChanges()
        }
    }

    computationRoute(entry: SearchEntry): string[] {
        return computationRouteCommands(entry.plugin_id, entry.correlation_uuid)
    }

    relativeTime(timestamp: Date | string): string {
        const date =
            typeof timestamp === 'string'
                ? new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(timestamp) ? timestamp : timestamp + 'Z')
                : timestamp
        const locale = getDateFnsLocale(this.translocoService.getActiveLang())
        return formatDistanceToNow(date, { addSuffix: true, locale })
    }

    startTour() {
        this.tourEngine.initializeTour()
    }
}
