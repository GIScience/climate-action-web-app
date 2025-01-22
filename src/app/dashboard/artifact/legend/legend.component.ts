import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core'
import {CommonModule} from '@angular/common'
import {convertToTitleCase} from '../../../utils/artifact-utils'
import {LegendObject} from '../artifact.interface'
import {NgScrollbar} from 'ngx-scrollbar' 

declare function evaluate_cmap(value: number, name: string, reverse?: boolean): [number, number, number]

interface LegendItem {
    name: string
}

@Component({
    selector: 'app-legend',
    standalone: true,
    imports: [CommonModule, NgScrollbar],
    templateUrl: './legend.component.html',
    styleUrls: ['./legend.component.scss']
})
export class LegendComponent implements OnInit, AfterViewInit {
    @Input() legendData!: LegendObject
    @ViewChild('ticksContainer') ticksContainer!: ElementRef
    @ViewChild('legendWrapper') legendWrapper!: ElementRef

    ngOnInit(): void {
        if (this.legendData.legend_type === 'CONTINUOUS') {
            this.plotColormap(this.legendData.legend_data.cmap_name)
        }
    }

    ngAfterViewInit(): void {
        if (this.legendData.legend_type === 'CONTINUOUS') {
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

    trackByFn(index: number, item: LegendItem): string {
        return item.name
    }

    plotColormap(name: string): void {
        const canvasId = `canvas_${name}`
        const reverse = name.endsWith('_r')

        if (reverse) {
            name = name.substring(0, name.length - 2)
        }

        setTimeout(() => {
            const canvas = document.getElementById(canvasId) as HTMLCanvasElement
            const ctx = canvas?.getContext('2d')
            if (canvas && ctx) {
                for (let y = 0; y <= canvas.height; y++) {
                    const [r, g, b] = evaluate_cmap(y / canvas.height, name, reverse)
                    ctx.fillStyle = `rgb(${r},${g},${b})`
                    ctx.fillRect(0, (canvas.height - y), canvas.width, 1)
                }
            }
        }, 0)
    }
}