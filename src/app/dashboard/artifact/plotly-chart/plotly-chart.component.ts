import { CommonModule } from '@angular/common'
import { AfterViewInit, Component, ElementRef, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import type { Data, Layout, PlotlyInstance } from 'plotly.js-strict-dist'
import { Subscription } from 'rxjs'
import { Artifact, PlotlyChartData } from '../artifact.interface'

type PlotlyModule = typeof import('plotly.js-strict-dist')

@Component({
    selector: 'app-plotly-chart',
    templateUrl: './plotly-chart.component.html',
    styleUrls: ['./plotly-chart.component.scss'],
    imports: [CommonModule, TranslocoModule]
})
export class PlotlyChartComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('plotlyChart') plotlyChart?: ElementRef<HTMLDivElement>
    @Input() inputData: { data: PlotlyChartData | null; artifact: Artifact | null } | undefined

    plotlyData: Data[] | null = null
    plotlyLayout: Partial<Layout> | null = null
    isLoading = false
    loadError = false

    private readonly translocoService = inject(TranslocoService)
    private readonly fullscreenClass = 'in-app-full'

    private Plotly: PlotlyModule | null = null
    private plotlyInstance: PlotlyInstance | null = null
    private langSubscription: Subscription | null = null
    private isFullscreen = false
    private originalParent: HTMLElement | null = null
    private originalNextSibling: Node | null = null

    private readonly fullscreenIcon = {
        width: 24,
        height: 24,
        path: 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M8 8h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'
    }

    ngOnInit(): void {
        if (!this.inputData?.data) return
        this.plotlyData = this.inputData.data.data
        this.plotlyLayout = this.inputData.data.layout

        this.langSubscription = this.translocoService.langChanges$.subscribe(() => {
            if (this.plotlyInstance) {
                this.initializePlotly()
            }
        })
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

            const deLocale = await import('plotly.js-locales/de')
            // Type assertion needed as the register method exists but isn't in strict dist typings
            ;(this.Plotly.default as unknown as { register: (locale: typeof deLocale.default) => void }).register(
                deLocale.default
            )

            const currentLang = this.translocoService.getActiveLang()

            const fullscreenTooltip = this.translocoService.translate('plotlyChart.tooltip.enterFullscreen')

            this.plotlyInstance = await this.Plotly.default.newPlot(
                this.plotlyChart.nativeElement,
                this.plotlyData,
                this.plotlyLayout,
                {
                    locale: currentLang,
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
                            name: fullscreenTooltip,
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
        this.langSubscription?.unsubscribe()
        document.removeEventListener('keydown', this.onKeyDown)

        if (this.isFullscreen && this.plotlyChart?.nativeElement) {
            this.exitFullscreen(this.plotlyChart.nativeElement)
        }

        if (this.plotlyInstance && this.plotlyChart?.nativeElement && this.Plotly) {
            this.Plotly.default.purge(this.plotlyChart.nativeElement)
        }
    }

    private toggleFullscreen = (element: HTMLElement): void => {
        if (this.isFullscreen) {
            this.exitFullscreen(element)
        } else {
            this.enterFullscreen(element)
        }
        this.updateFullscreenButton()
    }

    private updateFullscreenButton(): void {
        const modeBar = this.plotlyChart?.nativeElement.querySelector('.modebar')
        if (!modeBar) return

        const fullscreenBtn = this.findFullscreenButton(modeBar)
        if (!fullscreenBtn) return

        const tooltipKey = this.isFullscreen
            ? 'plotlyChart.tooltip.exitFullscreen'
            : 'plotlyChart.tooltip.enterFullscreen'

        fullscreenBtn.setAttribute('data-title', this.translocoService.translate(tooltipKey))
    }

    private findFullscreenButton(modeBar: Element): Element | undefined {
        const buttons = modeBar.querySelectorAll('[data-title]')
        return Array.from(buttons).find(btn => {
            const title = btn.getAttribute('data-title')
            return title?.includes('fullscreen') || title?.includes('Vollbild')
        })
    }

    private enterFullscreen(element: HTMLElement): void {
        this.originalParent = element.parentElement
        this.originalNextSibling = element.nextSibling

        const host = document.querySelector('main') || document.body
        element.classList.add(this.fullscreenClass)
        host.appendChild(element)
        this.isFullscreen = true
        this.deferResize(element)
    }

    private exitFullscreen(element: HTMLElement): void {
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

    private deferResize(element: HTMLElement): void {
        if (!this.Plotly) return

        const Plotly = this.Plotly
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                Plotly.default.Plots.resize(element)
            })
        })
    }

    private onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && this.isFullscreen && this.plotlyChart?.nativeElement) {
            this.exitFullscreen(this.plotlyChart.nativeElement)
            this.updateFullscreenButton()
        }
    }
}
