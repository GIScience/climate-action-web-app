import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core'
import { convertToTitleCase } from '@app/utils/artifact.utils'
import { NgScrollbar } from 'ngx-scrollbar'
import { LegendObject } from '../artifact.interface'

const colormapsModule = import('../../../../assets/scripts/js-colormaps.js')

interface LegendItem {
    name: string
}

@Component({
    selector: 'app-legend',
    imports: [NgScrollbar],
    templateUrl: './legend.component.html',
    styleUrls: ['./legend.component.scss']
})
export class LegendComponent implements AfterViewInit {
    @Input() legendData!: LegendObject
    @Input() artifactId?: string
    @ViewChild('ticksContainer') ticksContainer!: ElementRef
    @ViewChild('legendWrapper') legendWrapper!: ElementRef
    @ViewChild('legendCanvas') legendCanvas!: ElementRef<HTMLCanvasElement>

    ngAfterViewInit(): void {
        if (this.legendData.legend_type === 'CONTINUOUS') {
            this.plotColormap(this.legendData.legend_data.cmap_name)
            this.setWrapperWidth()
        }
    }

    setWrapperWidth(): void {
        if (!this.ticksContainer || !this.legendWrapper) {
            return
        }

        const spans = this.ticksContainer.nativeElement.querySelectorAll('span')
        let maxWidth = 0

        spans.forEach((span: HTMLSpanElement) => {
            const width = span.offsetWidth
            if (width > maxWidth) {
                maxWidth = width
            }
        })

        if (this.legendWrapper) {
            this.legendWrapper.nativeElement.style.width = `${maxWidth + 30}px`
        }
    }

    discreteItems() {
        return Object.entries(this.legendData.legend_data).map(([name, color]) => ({
            name: convertToTitleCase(name),
            color
        }))
    }

    continuousItems() {
        const ticks = this.legendData.legend_data.ticks
        return Object.entries(ticks).map(([name, value]) => ({
            name: convertToTitleCase(name),
            position: parseFloat(value as string) * 100
        }))
    }

    trackByFn(_index: number, item: LegendItem): string {
        return item.name
    }

    async plotColormap(name: string): Promise<void> {
        const reverse = name.endsWith('_r')

        if (reverse) {
            name = name.substring(0, name.length - 2)
        }

        const canvas = this.legendCanvas?.nativeElement
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) {
            const { evaluate_cmap } = await colormapsModule
            for (let y = 0; y <= canvas.height; y++) {
                const [r, g, b] = evaluate_cmap(y / canvas.height, name, reverse)
                ctx.fillStyle = `rgb(${r},${g},${b})`
                ctx.fillRect(0, canvas.height - y, canvas.width, 1)
            }
        }
    }
}
