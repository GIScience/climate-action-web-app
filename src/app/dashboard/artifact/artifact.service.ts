import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { SafeUrl } from '@angular/platform-browser'
import { BehaviorSubject, switchMap } from 'rxjs'
import { StoreService } from '../store/store.service'
import { Artifact, ArtifactData, ChartData, LegendObject, PlotlyChartData } from './artifact.interface'

@Injectable({
    providedIn: 'root'
})
export class ArtifactService {
    private http = inject(HttpClient)
    private storeService = inject(StoreService)

    currentUrl: string | null = null
    downloadJsonHref: SafeUrl | null = null

    private markdownSubject = new BehaviorSubject<ArtifactData | null>(null)
    markdown = this.markdownSubject.asObservable()

    private imageSubject = new BehaviorSubject<ArtifactData | null>(null)
    image = this.imageSubject.asObservable()

    private tableSubject = new BehaviorSubject<ArtifactData | null>(null)
    table = this.tableSubject.asObservable()

    private vectorSubject = new BehaviorSubject<ArtifactData | null>(null)
    vector = this.vectorSubject.asObservable()

    private rasterSubject = new BehaviorSubject<ArtifactData | null>(null)
    raster = this.rasterSubject.asObservable()

    private legendSubject = new BehaviorSubject<LegendObject | null>(null)
    legend = this.legendSubject.asObservable()

    private chartSubject = new BehaviorSubject<{ data: ChartData | null; artifact: Artifact | null }>({
        data: null,
        artifact: null
    })
    chart = this.chartSubject.asObservable()

    private plotlyChartSubject = new BehaviorSubject<{ data: PlotlyChartData | null; artifact: Artifact | null }>({
        data: null,
        artifact: null
    })
    plotlyChart = this.plotlyChartSubject.asObservable()

    getMarkdown(artifact: Artifact): void {
        this.resolveAndPublish(this.markdownSubject, artifact, artifact.filename)
    }

    getImage(artifact: Artifact): void {
        this.resolveAndPublish(this.imageSubject, artifact, artifact.filename)
    }

    getTable(artifact: Artifact): void {
        this.resolveAndPublish(this.tableSubject, artifact, artifact.filename)
    }

    getChart(artifact: Artifact): void {
        this.storeService
            .getArtifactS3Url(artifact.correlation_uuid, artifact.filename)
            .pipe(switchMap(url => this.http.get<ChartData>(url)))
            .subscribe({
                next: data => {
                    this.chartSubject.next({
                        data: data,
                        artifact: artifact
                    })
                },
                error: error => console.error(`Error fetching chart ${artifact.filename}:`, error)
            })
    }

    getPlotlyChart(artifact: Artifact): void {
        const filename = artifact.attachments.display_filename || artifact.filename
        this.storeService
            .getArtifactS3Url(artifact.correlation_uuid, filename)
            .pipe(switchMap(url => this.http.get<PlotlyChartData>(url)))
            .subscribe({
                next: data => {
                    this.plotlyChartSubject.next({
                        data: data,
                        artifact: artifact
                    })
                },
                error: error => console.error(`Error fetching chart ${artifact.filename}:`, error)
            })
    }

    getRaster(artifact: Artifact): void {
        const filename = artifact.attachments.display_filename || artifact.filename
        this.resolveAndPublish(this.rasterSubject, artifact, filename)
    }

    getVector(artifact: Artifact): void {
        const filename = artifact.attachments.display_filename || artifact.filename
        this.resolveAndPublish(this.vectorSubject, artifact, filename)
    }

    private resolveAndPublish(
        subject: BehaviorSubject<ArtifactData | null>,
        artifact: Artifact,
        filename: string
    ): void {
        this.storeService.getArtifactS3Url(artifact.correlation_uuid, filename).subscribe({
            next: url => subject.next({ url, ...artifact }),
            error: error => console.error(`Error resolving store URL for ${filename}:`, error)
        })
    }

    fetchArtifact(artifact: Artifact, options: { setLoading?: boolean } = {}): void {
        if (!artifact) return

        if (options.setLoading) {
            artifact.isLoading = true
        }

        setTimeout(() => {
            this.currentUrl = null
            this.downloadJsonHref = null

            switch (artifact.modality) {
                case 'MARKDOWN':
                    this.getMarkdown(artifact)
                    break
                case 'IMAGE':
                    this.getImage(artifact)
                    break
                case 'TABLE':
                    this.getTable(artifact)
                    break
                case 'VECTOR_MAP_LAYER':
                    this.getVector(artifact)
                    break
                case 'RASTER_MAP_LAYER':
                    this.getRaster(artifact)
                    break
                case 'CHART':
                    this.getChart(artifact)
                    break
                case 'CHART_PLOTLY':
                    this.getPlotlyChart(artifact)
                    break
            }
        })
    }

    clearLegend(): void {
        this.legendSubject.next(null)
    }

    getLegend(artifact: Artifact): void {
        const mapLegend = artifact.attachments.legend
        if (mapLegend) {
            mapLegend.title = mapLegend.title ? mapLegend.title : artifact.name
            this.legendSubject.next(mapLegend)
        } else {
            this.legendSubject.next(null)
        }
    }

    resetAllSubjects(): void {
        this.markdownSubject.next(null)
        this.imageSubject.next(null)
        this.tableSubject.next(null)
        this.chartSubject.next({ data: null, artifact: null })
        this.plotlyChartSubject.next({ data: null, artifact: null })
        this.vectorSubject.next(null)
        this.rasterSubject.next(null)
        this.legendSubject.next(null)
    }
}
