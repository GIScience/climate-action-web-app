import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core'
import { convertToTitleCase } from '@app/utils/artifact.utils'
import { NgScrollbar } from 'ngx-scrollbar'
import { ContinuousLegendItem, DiscreteLegendItem, LegendObject } from '../artifact.interface'

let colormapsModule: Promise<typeof import('../../../../assets/scripts/js-colormaps.js')>

@Component({
    selector: 'app-legend',
    imports: [NgScrollbar],
    templateUrl: './legend.component.html',
    styleUrls: ['./legend.component.scss']
})
export class LegendComponent implements AfterViewInit {
    private static nextLegendInstanceId = 0

    @Input() legendData!: LegendObject
    @Input() artifactId?: string
    @Input() onHiddenCategoriesChange?: (hiddenCategories: string[] | null) => void
    @ViewChild('ticksContainer') ticksContainer!: ElementRef
    @ViewChild('legendCanvas') legendCanvas!: ElementRef<HTMLCanvasElement>

    private readonly legendInstanceId = LegendComponent.nextLegendInstanceId++
    categoryVisibility = new Map<string, boolean>()

    ngAfterViewInit(): void {
        if (this.legendData.legend_type === 'CONTINUOUS') {
            this.plotColormap(this.legendData.legend_data.cmap_name)
        }
    }

    discreteItems(): DiscreteLegendItem[] {
        return Object.entries(this.legendData.legend_data).map(([name, color]) => ({
            displayName: convertToTitleCase(name),
            name,
            color,
            visible: this.categoryVisibility.get(name) ?? true
        }))
    }

    toggleCategory(name: string): void {
        const current = this.categoryVisibility.get(name) ?? true
        this.categoryVisibility.set(name, !current)

        if (this.onHiddenCategoriesChange) {
            const hiddenCategories = Array.from(this.categoryVisibility.entries())
                .filter(([, visible]) => !visible)
                .map(([name]) => name)
            this.onHiddenCategoriesChange(hiddenCategories.length === 0 ? null : hiddenCategories)
        }
    }

    continuousItems(): ContinuousLegendItem[] {
        const ticks = this.legendData.legend_data.ticks
        return Object.entries(ticks).map(([name, value]) => ({
            displayName: convertToTitleCase(name),
            position: parseFloat(value as string) * 100
        }))
    }

    trackByFn(_index: number, item: { displayName: string }): string {
        return item.displayName
    }

    getCategoryInputId(name: string): string {
        const prefix = this.artifactId || `legend-${this.legendInstanceId}`
        const encoded = name
            .split('')
            .map(c => (/[A-Za-z0-9\-_:]/.test(c) ? c : `_${c.charCodeAt(0)}_`))
            .join('')
        return `${prefix}-${encoded}`
    }

    async plotColormap(name: string): Promise<void> {
        const reverse = name.endsWith('_r')

        if (reverse) {
            name = name.substring(0, name.length - 2)
        }

        const canvas = this.legendCanvas?.nativeElement
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) {
            colormapsModule ??= import('../../../../assets/scripts/js-colormaps.js')
            const { evaluate_cmap } = await colormapsModule
            for (let y = 0; y <= canvas.height; y++) {
                const [r, g, b] = evaluate_cmap(y / canvas.height, name, reverse)
                ctx.fillStyle = `rgb(${r},${g},${b})`
                ctx.fillRect(0, canvas.height - y, canvas.width, 1)
            }
        }
    }
}
