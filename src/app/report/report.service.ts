import {Injectable} from '@angular/core'
import {BehaviorSubject} from 'rxjs'
import {HttpClient} from '@angular/common/http'
import {Artifact, ChartData} from '../artifact/artifact.interface'
import {environment} from '../../environments/environment'

@Injectable({
    providedIn: 'root'
})
export class ReportService {

    private apiUrl = environment.climateActionApiUrl

    private markdownSubject = new BehaviorSubject<string>('')
    markdown = this.markdownSubject.asObservable()

    private imageSubject = new BehaviorSubject<string>('')
    image = this.imageSubject.asObservable()

    private tableSubject = new BehaviorSubject<string>('')
    table = this.tableSubject.asObservable()

    private geojsonSubject = new BehaviorSubject<{ url: string, artifact: Artifact | null }>({url: '', artifact: null})
    geojson = this.geojsonSubject.asObservable()

    private geotiffSubject = new BehaviorSubject<{ url: string, artifact: Artifact | null }>({url: '', artifact: null})
    geotiff = this.geotiffSubject.asObservable()

    private legendSubject = new BehaviorSubject<any>(null)
    legend = this.legendSubject.asObservable()

    private chartSubject = new BehaviorSubject<{ data: ChartData | null, artifact: Artifact | null }>({
        data: null,
        artifact: null
    })
    chart = this.chartSubject.asObservable()

    constructor(private http: HttpClient) {
    }

    getMarkdown(artifact: Artifact): void {
        this.markdownSubject.next(`${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`)
    }

    getImage(artifact: Artifact): void {
        this.imageSubject.next(`${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`)
    }

    getTable(artifact: Artifact): void {
        this.tableSubject.next(`${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`)
    }

    getChart(artifact: Artifact): void {
        this.http.get<ChartData>(`${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`).subscribe((data) => {
            this.chartSubject.next({
                data: data,
                artifact
            })
        })
    }

    getGeoTiff(artifact: Artifact): void {
        this.geotiffSubject.next({
            url: `${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            artifact
        })
    }

    getGeoJson(artifact: Artifact): void {
        this.geojsonSubject.next({
            url: `${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            artifact
        })
    }

    resetReports(): void {
        this.markdownSubject.next('')
        this.imageSubject.next('')
        this.tableSubject.next('')
        this.chartSubject.next({ data: null, artifact: null })
        this.geojsonSubject.next({ url: '', artifact: null })
        this.geotiffSubject.next({ url: '', artifact: null })
    }

    getLegend(artifact: Artifact): void {
        const url = `${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}`
        this.http.get<any[]>(url).subscribe((response) => {
            const mapLegend = response.find(item => item.store_id === artifact.store_id)?.attachments?.LEGEND
            if (mapLegend) {
              this.legendSubject.next(mapLegend)
            } else {
              this.legendSubject.next(null)
            }
        })
    }
}
