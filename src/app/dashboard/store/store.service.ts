import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { environment } from '@environments/environment'
import { Observable, map } from 'rxjs'

export interface StoreUrlResponse {
    go_to: string
}

@Injectable({
    providedIn: 'root'
})
export class StoreService {
    private http = inject(HttpClient)

    private apiUrl = environment.climateActionApiUrl

    getArtifactS3Url(correlationUuid: string, filename: string): Observable<string> {
        return this.http
            .get<StoreUrlResponse>(`${this.apiUrl}/store/${correlationUuid}/${filename}`)
            .pipe(map(response => response.go_to))
    }
}
