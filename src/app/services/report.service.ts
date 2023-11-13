import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {ArtifactType, ChartResponse} from "../models/artifact.interface";
import {environment} from "../../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class ReportService {

    private apiUrl = environment.climateActionApiUrl;

    private bsMarkdown = new BehaviorSubject<string>('')
    markdownOb = this.bsMarkdown.asObservable()
    private bsImage = new BehaviorSubject<string>('')
    imageOb = this.bsImage.asObservable()
    private bsTable = new BehaviorSubject<string>('')
    tableOb = this.bsTable.asObservable()
    private bsGeoJson = new BehaviorSubject<{ url: string, artifact: ArtifactType | null }>({url: '', artifact: null})
    geojsonOb = this.bsGeoJson.asObservable()
    private bsGeoTiff = new BehaviorSubject<{ url: string, artifact: ArtifactType | null }>({url: '', artifact: null})
    geotiffOb = this.bsGeoTiff.asObservable()
    private bsChart = new BehaviorSubject<{ data: ChartResponse | null, artifact: ArtifactType | null }>({data: null, artifact: null})
    chartOb = this.bsChart.asObservable()

    constructor(private http: HttpClient) {
    }

    // Method to handle MARKDOWN response
    getMarkdown(artifact: ArtifactType): void {
        this.bsMarkdown.next(this.apiUrl + '/store/' + artifact.correlation_uuid + '/' + artifact.store_id)
    }

    // Method to handle IMAGE response
    getImage(artifact: ArtifactType): void {
        // send the image URL to the subscriber
        this.bsImage.next(this.apiUrl + '/store/' + artifact.correlation_uuid + '/' + artifact.store_id)
    }

    // Method to handle TABLE response
    getTable(artifact: ArtifactType): void {
        this.bsTable.next(this.apiUrl + '/store/' + artifact.correlation_uuid + '/' + artifact.store_id)
    }

    // Method to handle CHART response
    getChart(artifact: ArtifactType): void {
        this.http.get<ChartResponse>(this.apiUrl + '/store/' + artifact.correlation_uuid + '/' + artifact.store_id).subscribe((data) => {
            // console.log('>>> ReportService >>> getChart ', data)
            this.bsChart.next({
                data: data,
                artifact
            })
        })
    }

    // Method to handle GeoTIFF response
    getGeoTiff(artifact: ArtifactType): void {
        this.bsGeoTiff.next({
            url: this.apiUrl + '/store/' + artifact.correlation_uuid + '/' + artifact.store_id,
            artifact
        })
    }

    // Method to handle GeoJSON response
    getGeoJson(artifact: ArtifactType): void {
        this.bsGeoJson.next({
            url: this.apiUrl + '/store/' + artifact.correlation_uuid + '/' + artifact.store_id,
            artifact
        })
    }

}
