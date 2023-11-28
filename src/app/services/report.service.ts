import {Injectable} from '@angular/core'
import {BehaviorSubject} from 'rxjs'
import {HttpClient} from '@angular/common/http'
import {Artifact, ChartResponse} from '../artifact/artifact.interface'
import {environment} from '../../environments/environment'

@Injectable({
    providedIn: 'root'
})
export class ReportService {

    private apiUrl = environment.climateActionApiUrl

    private bsMarkdown = new BehaviorSubject<string>('')
    markdownOb = this.bsMarkdown.asObservable()
    private bsImage = new BehaviorSubject<string>('')
    imageOb = this.bsImage.asObservable()
    private bsTable = new BehaviorSubject<string>('')
    tableOb = this.bsTable.asObservable()
    private bsGeoJson = new BehaviorSubject<{ url: string, artifact: Artifact | null }>({url: '', artifact: null})
    geojsonOb = this.bsGeoJson.asObservable()
    private bsGeoTiff = new BehaviorSubject<{ url: string, artifact: Artifact | null }>({url: '', artifact: null})
    geotiffOb = this.bsGeoTiff.asObservable()
    private bsChart = new BehaviorSubject<{ data: ChartResponse | null, artifact: Artifact | null }>({
        data: null,
        artifact: null
    })
    chartOb = this.bsChart.asObservable()

    constructor(private http: HttpClient) {
    }

    getMarkdown(artifact: Artifact): void {
        this.bsMarkdown.next(`${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`)
    }

    getImage(artifact: Artifact): void {
        this.bsImage.next(`${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`)
    }

    getTable(artifact: Artifact): void {
        this.bsTable.next(`${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`)
    }

    getChart(artifact: Artifact): void {
        this.http.get<ChartResponse>(`${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`).subscribe((data) => {
            this.bsChart.next({
                data: data,
                artifact
            })
        })
    }

    getGeoTiff(artifact: Artifact): void {
        this.bsGeoTiff.next({
            url: `${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            artifact
        })
    }

    getGeoJson(artifact: Artifact): void {
        this.bsGeoJson.next({
            url: `${this.apiUrl}/api/v1/gateway/store/${artifact.correlation_uuid}/${artifact.store_id}`,
            artifact
        })
    }
}
