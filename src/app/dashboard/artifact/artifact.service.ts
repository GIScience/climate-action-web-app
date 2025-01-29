import { HttpClient } from '@angular/common/http'
import { EventEmitter, Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { environment } from '../../../environments/environment'
import { Artifact, ArtifactData, ChartData, LegendObject } from './artifact.interface'

@Injectable({
    providedIn: 'root'
})
export class ArtifactService {
    isArtifactVisible = false
    closeArtifactEvent = new EventEmitter<void>()

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

    constructor(private http: HttpClient) {}

    getMarkdown(artifact: Artifact): void {
        this.markdownSubject.next({
            url: `${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            ...artifact
        })
    }

    getImage(artifact: Artifact): void {
        this.imageSubject.next({
            url: `${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            ...artifact
        })
    }

    getTable(artifact: Artifact): void {
        this.tableSubject.next({
            url: `${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            ...artifact
        })
    }

    getChart(artifact: Artifact): void {
        this.http
            .get<ChartData>(`${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`)
            .subscribe(data => {
                this.chartSubject.next({
                    data: data,
                    artifact: artifact
                })
            })
    }

    getGeoTiff(artifact: Artifact): void {
        this.geotiffSubject.next({
            url: `${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            ...artifact
        })
    }

    getGeoJson(artifact: Artifact): void {
        this.geojsonSubject.next({
            url: `${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            ...artifact
        })
    }

    closeArtifact(): void {
        this.resetArtifacts()
        localStorage.setItem('active_artifact', '[]')
        this.closeArtifactEvent.emit()
    }

    resetArtifacts(): void {
        this.markdownSubject.next(null)
        this.imageSubject.next(null)
        this.tableSubject.next(null)
        this.chartSubject.next({ data: null, artifact: null })
        this.geojsonSubject.next(null)
        this.geotiffSubject.next(null)
        this.legendSubject.next(null)
    }

    clearLegend(): void {
        this.legendSubject.next(null)
    }

    getLegend(artifact: Artifact): void {
        const mapLegend = artifact.attachments.LEGEND
        if (mapLegend) {
            mapLegend.title = mapLegend.title ? mapLegend.title : artifact.name
            this.legendSubject.next(mapLegend)
        } else {
            this.legendSubject.next(null)
        }
    }
}
