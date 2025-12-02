import { CommonModule, NgOptimizedImage } from '@angular/common'
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core'
import { RouterModule } from '@angular/router'
import { derivePluginNameFromId } from '@app/utils/string.utils'
import { TranslocoModule } from '@jsverse/transloco'
import { StorageService } from '../../storage.service'
import { ComputationDatabaseEntity } from '../computations-index/computation.interface'
import { TourEngine } from '../walkthrough/tour-engine.service'

@Component({
    selector: 'app-landing',
    imports: [CommonModule, RouterModule, NgOptimizedImage, TranslocoModule],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
    private storageService = inject(StorageService)
    private cdr = inject(ChangeDetectorRef)
    private tourEngine = inject(TourEngine)

    totalActiveComputations = 0
    latestComputation: ComputationDatabaseEntity | null = null
    loading = true

    async ngOnInit() {
        try {
            const [totalCount, latestComp] = await Promise.all([
                this.storageService.getTotalActiveComputationsCount(),
                this.storageService.getLatestActiveComputation()
            ])

            this.totalActiveComputations = totalCount
            this.latestComputation = latestComp
        } catch (error) {
            console.error('Error loading landing page data:', error)
        } finally {
            this.loading = false
            this.cdr.detectChanges()
        }
    }

    getPluginName(pluginId: string | undefined): string {
        return pluginId ? derivePluginNameFromId(pluginId) : 'Unknown Plugin'
    }

    startTour() {
        this.tourEngine.initializeTour()
    }
}
