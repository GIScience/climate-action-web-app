import {Component, OnInit, ChangeDetectorRef} from '@angular/core'
import {CommonModule} from '@angular/common'
import {RouterModule} from '@angular/router'
import {PluginService} from '../plugin/plugin.service'
import {ComputationEntity} from '../computations-index/computation.interface'
import {pickRandomGradient} from '../../utils/style-utils'

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.scss'
})

export class LandingComponent implements OnInit {
    currentRuns: ComputationEntity[] = []
    pluginCounts: { pluginName: string; pluginId: string; count: number }[] = []
    private gradientCache: { [key: string]: string } = {}

    protected getGradient(index: number): string {
        return this.gradientCache[index]
    }

    constructor(
        private pluginService: PluginService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.currentRuns = this.pluginService.getComputesFromLS(['PENDING', 'STARTED', 'SUCCESS'])
        this.calculatePluginCounts()
        
        this.pluginCounts.forEach((_, index) => {
            this.gradientCache[index] = pickRandomGradient(this.gradientCache)
        })
        
        this.cdr.detectChanges()
        this.cdr.detach()
    }

    private calculatePluginCounts() {
        const counts = this.currentRuns.reduce((acc, run) => {
            if (run.pluginId) {
                acc[run.pluginId] = {
                    pluginName: run.pluginName || '',
                    pluginId: run.pluginId,
                    count: (acc[run.pluginId]?.count || 0) + 1
                }
            }
            return acc
        }, {} as Record<string, { pluginName: string, pluginId: string, count: number }>)

        this.pluginCounts = Object.values(counts).map(value => ({
            pluginName: value.pluginName,
            pluginId: value.pluginId,
            count: value.count
        }))
    }

    calculateBubbleSize(count: number): number {
        const minSize = 100
        const maxSize = 200
        const maxCount = Math.max(...this.pluginCounts.map(p => p.count))
        const scale = maxCount === 1 ? 0 : (count - 1) / (maxCount - 1)
        return minSize + (maxSize - minSize) * scale
    }
}