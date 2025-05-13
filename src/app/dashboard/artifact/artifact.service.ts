import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { SafeUrl } from '@angular/platform-browser'
import { environment } from '@environments/environment'
import { BehaviorSubject } from 'rxjs'
import { Artifact, ArtifactData, ChartData, LegendObject, PlotlyChartData } from './artifact.interface'

@Injectable({
    providedIn: 'root'
})
export class ArtifactService {
    currentUrl: string | null = null
    downloadJsonHref: SafeUrl | null = null

    private apiUrl = environment.climateActionApiUrl

    private markdownSubject = new BehaviorSubject<ArtifactData | null>(null)
    markdown = this.markdownSubject.asObservable()

    private imageSubject = new BehaviorSubject<ArtifactData | null>(null)
    image = this.imageSubject.asObservable()

    private tableSubject = new BehaviorSubject<ArtifactData | null>(null)
    table = this.tableSubject.asObservable()

    private geojsonSubject = new BehaviorSubject<ArtifactData | null>(null)
    geojson = this.geojsonSubject.asObservable()

    private geotiffSubject = new BehaviorSubject<ArtifactData | null>(null)
    geotiff = this.geotiffSubject.asObservable()

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

    constructor(private http: HttpClient) {}

    getMarkdown(artifact: Artifact): void {
        this.markdownSubject.next({
            url: `${this.apiUrl}/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            ...artifact
        })
    }

    getImage(artifact: Artifact): void {
        this.imageSubject.next({
            url: `${this.apiUrl}/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            ...artifact
        })
    }

    getTable(artifact: Artifact): void {
        this.tableSubject.next({
            url: `${this.apiUrl}/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            ...artifact
        })
    }

    getChart(artifact: Artifact): void {
        this.http
            .get<ChartData>(`${this.apiUrl}/store/${artifact.correlation_uuid}/${artifact.store_id}`)
            .subscribe(data => {
                this.chartSubject.next({
                    data: data,
                    artifact: artifact
                })
            })
    }

    getPlotlyChart(artifact: Artifact): void {
        this.http
            .get<PlotlyChartData>(`${this.apiUrl}/store/${artifact.correlation_uuid}/${artifact.store_id}`)
            .subscribe(data => {
                this.plotlyChartSubject.next({
                    data: data,
                    artifact: artifact
                })
            })
    }

    getGeoTiff(artifact: Artifact): void {
        this.geotiffSubject.next({
            url: `${this.apiUrl}/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            ...artifact
        })
    }

    getGeoJson(artifact: Artifact): void {
        this.geojsonSubject.next({
            url: `${this.apiUrl}/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            ...artifact
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
                case 'MAP_LAYER_GEOJSON':
                    this.getGeoJson(artifact)
                    break
                case 'MAP_LAYER_GEOTIFF':
                    this.getGeoTiff(artifact)
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
        this.geojsonSubject.next(null)
        this.geotiffSubject.next(null)
        this.legendSubject.next(null)
    }
}
