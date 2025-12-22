import { CommonModule } from '@angular/common'
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core'
import type { Data, Layout, PlotlyInstance } from 'plotly.js-strict-dist'
import { Artifact, PlotlyChartData } from '../artifact.interface'

type PlotlyModule = typeof import('plotly.js-strict-dist')

@Component({
    selector: 'app-plotly-chart',
    templateUrl: './plotly-chart.component.html',
    styleUrls: ['./plotly-chart.component.scss'],
    imports: [CommonModule]
})
export class PlotlyChartComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('plotlyChart') plotlyChart?: ElementRef<HTMLDivElement>
    @Input() inputData: { data: PlotlyChartData | null; artifact: Artifact | null } | undefined

    public plotlyData: Data[] | null = null
    public plotlyLayout: Partial<Layout> | null = null
    private plotlyInstance: PlotlyInstance | null = null

    private Plotly: PlotlyModule | null = null
    isLoading = false
    loadError = false

    private isFullscreen = false
    private originalParent: HTMLElement | null = null
    private originalNextSibling: Node | null = null
    private readonly fullscreenClass = 'in-app-full'

    private fullscreenIcon = {
        width: 512,
        height: 512,
        path: 'M512 512v-208l-80 80-96-96-48 48 96 96-80 80z M512 0h-208l80 80-96 96 48 48 96-96 80 80z M0 512h208l-80-80 96-96-48-48-96 96-80-80z M0 0v208l80-80 96 96 48-48-96-96 80-80z',
        transform: 'matrix(0.8, 0, 0, 0.8, 51.2, 51.2)'
    }

    ngOnInit(): void {
        if (!this.inputData?.data) return
        this.plotlyData = this.inputData.data.data
        this.plotlyLayout = this.inputData.data.layout
    }

    ngAfterViewInit(): void {
        this.initializePlotly()
        document.addEventListener('keydown', this.onKeyDown)
    }

    private async initializePlotly() {
        if (!this.plotlyChart?.nativeElement || !this.plotlyData || !this.plotlyLayout) return

        try {
            this.isLoading = true
            this.loadError = false

            this.Plotly = await import('plotly.js-strict-dist')

            this.plotlyInstance = await this.Plotly.default.newPlot(
                this.plotlyChart.nativeElement,
                this.plotlyData,
                this.plotlyLayout,
                {
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    toImageButtonOptions: {
                        filename: this.inputData?.artifact?.name,
                        format: 'jpeg',
                        height: 1000,
                        width: 1500,
                        scale: 1.5
                    },
                    modeBarButtonsToRemove: ['zoom', 'pan', 'select', 'lasso2d', 'autoscale'],
                    modeBarButtonsToAdd: [
                        {
                            name: 'Fullscreen',
                            icon: this.fullscreenIcon,
                            click: this.toggleFullscreen
                        }
                    ]
                }
            )
            this.isLoading = false
        } catch (error) {
            console.error('Error initializing Plotly chart:', error)
            this.isLoading = false
            this.loadError = true
        }
    }

    ngOnDestroy(): void {
        document.removeEventListener('keydown', this.onKeyDown)
        if (this.isFullscreen && this.plotlyChart?.nativeElement) {
            this.exitFullscreen(this.plotlyChart.nativeElement)
        }
        if (this.plotlyInstance && this.plotlyChart?.nativeElement && this.Plotly) {
            this.Plotly.default.purge(this.plotlyChart.nativeElement)
        }
    }

    private toggleFullscreen = (gd: HTMLElement) => {
        const element = gd

        if (!this.isFullscreen) {
            this.enterFullscreen(element)
        } else {
            this.exitFullscreen(element)
        }

        this.deferResize(element)
    }

    private enterFullscreen(element: HTMLElement) {
        this.originalParent = element.parentElement
        this.originalNextSibling = element.nextSibling

        const host = document.querySelector('main') || document.body
        element.classList.add(this.fullscreenClass)
        host.appendChild(element)
        this.isFullscreen = true
        this.deferResize(element)
    }

    private exitFullscreen(element: HTMLElement) {
        element.classList.remove(this.fullscreenClass)
        if (this.originalParent) {
            if (this.originalNextSibling) {
                this.originalParent.insertBefore(element, this.originalNextSibling)
            } else {
                this.originalParent.appendChild(element)
            }
        }
        this.originalParent = null
        this.originalNextSibling = null
        this.isFullscreen = false
        this.deferResize(element)
    }

    private deferResize(element: HTMLElement) {
        if (!this.Plotly) return
        const Plotly = this.Plotly
        // Two RAFs to ensure layout has settled after DOM move
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                Plotly.default.Plots.resize(element)
            })
        })
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.isFullscreen && this.plotlyChart?.nativeElement) {
            this.exitFullscreen(this.plotlyChart.nativeElement)
        }
    }
}
