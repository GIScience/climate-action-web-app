import { HttpClient } from '@angular/common/http'
import { ElementRef, Injectable, QueryList, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import type { jsPDF } from 'jspdf'
import { ToastrService } from 'ngx-toastr'
import { lastValueFrom } from 'rxjs'
import { ArtifactEntity } from '../artifact/artifact.interface'
import { ComputationBasicInfo } from '../computations-index/computation.interface'
import { ReportService } from './report.service'

type Html2CanvasType = typeof import('html2canvas').default

@Injectable({
    providedIn: 'root'
})
export class ExportPDFService {
    private http = inject(HttpClient)
    private toastr = inject(ToastrService)
    private reportService = inject(ReportService)
    private translocoService = inject(TranslocoService)

    private async loadPdfLibraries(): Promise<{
        jsPDF: typeof import('jspdf').jsPDF
        html2canvas: Html2CanvasType
    }> {
        const [jsPDFModule, html2canvasModule] = await Promise.all([import('jspdf'), import('html2canvas')])
        return {
            jsPDF: jsPDFModule.jsPDF,
            html2canvas: html2canvasModule.default
        }
    }

    async exportToPDF(
        artifacts: ArtifactEntity[],
        artifactContainers: QueryList<ElementRef>,
        getComputationInfo: (artifact: ArtifactEntity) => ComputationBasicInfo | undefined
    ) {
        try {
            this.toastr.info(this.translocoService.translate('report.exportingPdf'), '', {
                timeOut: 30000,
                positionClass: 'toast-top-center'
            })

            const { jsPDF, html2canvas } = await this.loadPdfLibraries()

            const imageCache: Record<string, string> = {}
            const legendImageCache: Record<string, string> = {}
            await this.prepareArtifactImages(artifacts, artifactContainers, imageCache)
            await this.captureLegendImages(artifacts, html2canvas, legendImageCache)

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            })

            await this.generatePdfPages(
                pdf,
                html2canvas,
                imageCache,
                legendImageCache,
                artifacts,
                getComputationInfo,
                artifactContainers
            )

            pdf.save(`climate-action-navigator_report-${new Date().toISOString().split('T')[0]}.pdf`)
            this.toastr.clear()
        } catch (error) {
            console.error('Error exporting PDF:', error)
            this.toastr.error(this.translocoService.translate('report.errorExportingPdf'))
        }
    }

    private async generatePdfPages(
        pdf: jsPDF,
        html2canvas: Html2CanvasType,
        imageCache: Record<string, string>,
        legendImageCache: Record<string, string>,
        artifacts: ArtifactEntity[],
        getComputationInfo: (artifact: ArtifactEntity) => ComputationBasicInfo | undefined,
        artifactContainers: QueryList<ElementRef>
    ) {
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const margin = 10
        const contentWidth = pageWidth - 2 * margin
        const itemsPerPage = 2
        const totalPages = Math.ceil(artifacts.length / itemsPerPage)

        const css = await lastValueFrom(this.http.get('./assets/styles/pdf-report.css', { responseType: 'text' }))

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            if (pageIndex > 0) {
                pdf.addPage()
            }

            this.addPageHeaderFooter(pdf, pageIndex + 1, totalPages)

            const startIndex = pageIndex * itemsPerPage
            const pageArtifacts = artifacts.slice(startIndex, startIndex + itemsPerPage)

            const element = document.createElement('div')
            element.innerHTML = `
                <div class="pdf-container">
                    ${this.getPageContent(pageArtifacts, imageCache, legendImageCache, getComputationInfo, artifactContainers)}
                </div>
            `

            const style = document.createElement('style')
            style.textContent = css
            element.appendChild(style)

            document.body.appendChild(element)

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false
            })

            document.body.removeChild(element)

            const imgHeight = (canvas.height * contentWidth) / canvas.width
            pdf.addImage(
                canvas.toDataURL('image/jpeg', 0.98),
                'JPEG',
                margin,
                margin + 15,
                contentWidth,
                Math.min(imgHeight, pageHeight - 2 * margin - 20)
            )
        }
    }

    private addPageHeaderFooter(pdf: jsPDF, pageNumber: number, totalPages: number) {
        const { width: pageWidth, height: pageHeight } = pdf.internal.pageSize

        const margin = 10

        // Header
        pdf.addImage('assets/images/ca-logo--horizontal.png', 'PNG', pageWidth / 2 - 25, margin, 50, 6.5)

        pdf.setDrawColor(0, 88, 88)
        pdf.line(margin, margin + 10, pageWidth - margin, margin + 10)

        // Footer
        pdf.setDrawColor(0, 88, 88)
        pdf.line(margin, pageHeight - margin - 8, pageWidth - margin, pageHeight - margin - 8)

        pdf.setFontSize(10)
        pdf.setTextColor(100)
        pdf.text('© ' + new Date().getFullYear() + ' HeiGIT gGmbH', margin, pageHeight - margin)

        pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - margin, {
            align: 'right'
        })
    }

    private getPageContent(
        artifacts: ArtifactEntity[],
        imageCache: Record<string, string>,
        legendImageCache: Record<string, string>,
        getComputationInfo: (artifact: ArtifactEntity) => ComputationBasicInfo | undefined,
        artifactContainers: QueryList<ElementRef>
    ): string {
        return artifacts
            .map(artifact => {
                const computationInfo = getComputationInfo(artifact)
                return `
                <div class="report-item">
                    <div class="report-item-header">
                        <h3>${artifact.name}</h3>
                        ${
                            computationInfo
                                ? `
                            <div class="report-item-metadata">
                                (<span>${computationInfo.aoiName}</span> |
                                <span>${computationInfo.pluginName}</span> |
                                <span>#${computationInfo.correlation_uuid.substring(0, 8)}</span>)
                            </div>
                        `
                                : ''
                        }
                    </div>
                    <div class="artifact-content">
                        ${this.getArtifactContent(artifact, imageCache, legendImageCache, artifactContainers)}
                    </div>
                </div>
            `
            })
            .join('')
    }

    private async prepareArtifactImages(
        artifacts: ArtifactEntity[],
        artifactContainers: QueryList<ElementRef>,
        imageCache: Record<string, string>
    ): Promise<void> {
        const imageArtifacts = artifacts.filter(artifact => artifact.modality === 'IMAGE')
        const mapArtifacts = artifacts.filter(artifact => this.reportService.isMapArtifact(artifact.modality))

        const mapCapturePromises = mapArtifacts.map(artifact => this.captureMapFromDOM(artifact, imageCache))

        const imagePromises = imageArtifacts.map(async artifact => {
            const artifactKey = this.reportService.getArtifactKey(artifact)
            const artifactElement = artifactContainers?.find(
                container => container.nativeElement.getAttribute('data-artifact-id') === artifactKey
            )

            if (artifactElement) {
                const img = artifactElement.nativeElement.querySelector('app-artifact img') as HTMLImageElement
                if (img && img.src) {
                    try {
                        imageCache[artifactKey] = await this.convertImageToBase64(img.src)
                    } catch (error) {
                        console.warn(`Failed to convert image for ${artifact.name}:`, error)
                    }
                }
            }
        })

        await Promise.all([...mapCapturePromises, ...imagePromises])
    }

    private async captureMapFromDOM(artifact: ArtifactEntity, mapImageCache: Record<string, string>): Promise<void> {
        const artifactKey = this.reportService.getArtifactKey(artifact)
        // @ts-ignore: Access global map instance for PDF export
        const mapInstance = window[`maplibre_map_${artifactKey}`]
        if (!mapInstance) return

        try {
            await new Promise<void>(resolve =>
                mapInstance.loaded() ? resolve() : (mapInstance.once('idle', resolve), setTimeout(resolve, 3000))
            )

            const screenshot = await new Promise<string>(resolve => {
                mapInstance.once('render', () => resolve(mapInstance.getCanvas().toDataURL('image/png')))
                mapInstance.setBearing(mapInstance.getBearing() + 0.001)
                setTimeout(() => resolve(''), 3000)
            })

            if (screenshot?.length > 5000) mapImageCache[artifactKey] = screenshot
        } catch (error) {
            console.warn(`Failed to capture map for ${artifact.name}:`, error)
        }
    }

    private convertImageToBase64(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'

            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'))
                    return
                }

                ctx.drawImage(img, 0, 0)

                try {
                    const dataURL = canvas.toDataURL('image/png')
                    resolve(dataURL)
                } catch (error) {
                    reject(error)
                }
            }

            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = url
        })
    }

    private getArtifactContent(
        artifact: ArtifactEntity,
        imageCache: Record<string, string>,
        legendImageCache: Record<string, string>,
        artifactContainers: QueryList<ElementRef>
    ) {
        const isMap = this.reportService.isMapArtifact(artifact.modality)
        const isImage = artifact.modality === 'IMAGE'
        const artifactKey = this.reportService.getArtifactKey(artifact)

        if (isMap || isImage) {
            if (imageCache[artifactKey]) {
                const legendImg = legendImageCache[artifactKey]
                    ? `<img class="pdf-legend-img" src="${legendImageCache[artifactKey]}" alt="Legend" style="position:absolute;top:5px;right:5px;width:150px;height:auto;" />`
                    : ''
                return `
                    <div class="map-image-container">
                        <img src="${imageCache[artifactKey]}" alt="${artifact.name}" />
                        ${legendImg}
                    </div>
                `
            }
            return `<p><em>${isMap ? 'Map' : 'Image'} could not be rendered, please try again.</em></p>`
        }

        const artifactComponent = artifactContainers
            ?.find(container => container.nativeElement.getAttribute('data-artifact-id') === artifactKey)
            ?.nativeElement.querySelector('app-artifact')

        if (artifactComponent) {
            const clonedComponent = artifactComponent.cloneNode(true) as HTMLElement
            clonedComponent.querySelectorAll('button').forEach(btn => btn.remove())
            return clonedComponent.outerHTML
        }

        return `<p><em>There was an error rendering <strong>${artifact.name}</strong>, please try again.</em></p>`
    }

    private async captureLegendImages(
        artifacts: ArtifactEntity[],
        html2canvas: Html2CanvasType,
        legendImageCache: Record<string, string>
    ): Promise<void> {
        const mapArtifacts = artifacts.filter(a => this.reportService.isMapArtifact(a.modality))

        for (const artifact of mapArtifacts) {
            const artifactKey = this.reportService.getArtifactKey(artifact)
            const container = document.getElementById(`report-map-legend-${artifactKey}`)
            if (!container) continue

            // ViewContainerRef.createComponent() inserts as a sibling
            const appLegend = container.nextElementSibling
            if (!appLegend || appLegend.tagName !== 'APP-LEGEND') continue

            try {
                const canvas = await html2canvas(appLegend as HTMLElement, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                })
                legendImageCache[artifactKey] = canvas.toDataURL('image/png')
            } catch (error) {
                console.warn(`Failed to capture legend for ${artifact.name}:`, error)
            }
        }
    }
}
