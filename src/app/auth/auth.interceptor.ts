import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from '@environments/environment'
import { Observable, from, lastValueFrom } from 'rxjs'
import { DatabaseService } from '../database.service'
import { AppwriteService } from './appwrite.service'

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private apiKey: string | null = null
    private apiBaseUrl = environment.climateActionApiUrl
    private authInitPromise: Promise<void> | null = null

    constructor(
        private databaseService: DatabaseService,
        private appwriteService: AppwriteService
    ) {
        this.authInitPromise = this.initAuth()

        this.appwriteService._user.subscribe(user => (user ? this.loadApiKey() : (this.apiKey = null)))
    }

    private async initAuth(): Promise<void> {
        try {
            await this.appwriteService.tryToLogin()
            if (this.appwriteService._user.value) {
                await this.loadApiKey()
            }
        } catch (err) {
            console.error('Error initializing auth:', err)
        }
    }

    private async loadApiKey(): Promise<void> {
        try {
            const keyInfo = await this.databaseService.getBasicKey()
            this.apiKey = keyInfo?.key || null
        } catch (_err) {
            this.apiKey = null
        }
    }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        if (request.url.includes(this.apiBaseUrl)) {
            return from(this.processWithAuth(request, next))
        }

        return next.handle(request)
    }

    private async processWithAuth(request: HttpRequest<unknown>, next: HttpHandler): Promise<HttpEvent<unknown>> {
        if (this.authInitPromise) {
            await this.authInitPromise
            this.authInitPromise = null
        }

        if (this.appwriteService._user.value && this.apiKey) {
            request = request.clone({
                setHeaders: { Authorization: this.apiKey }
            })
        }

        return lastValueFrom(next.handle(request))
    }
}
