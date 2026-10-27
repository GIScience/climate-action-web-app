import { HttpEvent, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { environment } from '@environments/environment'
import { Models } from 'appwrite'
import { BehaviorSubject, firstValueFrom, Observable, of } from 'rxjs'
import { Mock } from 'vitest'
import { AppwriteService, BasicKeyInfo } from './appwrite.service'
import { AuthInterceptor } from './auth.interceptor'

describe('AuthInterceptor', () => {
    let interceptor: AuthInterceptor
    let mockAppwriteService: Partial<AppwriteService>
    let mockHttpHandler: HttpHandler
    let mockUserSubject: BehaviorSubject<Models.User<Models.Preferences> | null>
    let mockHandleFunction: Mock

    const mockUser = {
        $id: 'test-user-id',
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        name: 'Test User',
        email: 'test@example.com',
        emailVerification: true
    } as unknown as Models.User<Models.Preferences>

    const mockKeyInfo: BasicKeyInfo = {
        $id: 'test-key-id',
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        $permissions: [],
        $tableId: 'basic_keys',
        $databaseId: 'tyk_integration',
        $sequence: '0',
        hash: 'test-hash',
        tyk_user_id: 'test-tyk-user-id',
        ors_policy: 'test-policy',
        policy_upgrade_requests: [],
        key: 'test-api-key'
    }

    beforeEach(() => {
        mockUserSubject = new BehaviorSubject<Models.User<Models.Preferences> | null>(null)
        mockHandleFunction = vi.fn().mockReturnValue(of(new HttpResponse<unknown>()))

        mockAppwriteService = {
            _user: mockUserSubject,
            tryToLogin: () => Promise.resolve(true),
            getBasicKey: () => Promise.resolve(mockKeyInfo)
        }

        mockHttpHandler = {
            handle: (req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> => {
                return mockHandleFunction(req) as Observable<HttpEvent<unknown>>
            }
        }

        vi.spyOn(mockAppwriteService, 'tryToLogin')
        vi.spyOn(mockAppwriteService, 'getBasicKey')

        TestBed.configureTestingModule({
            providers: [AuthInterceptor, { provide: AppwriteService, useValue: mockAppwriteService }]
        })

        interceptor = TestBed.inject(AuthInterceptor)
    })

    it('should attempt to login on initialization', () => {
        expect(mockAppwriteService.tryToLogin).toHaveBeenCalled()
    })

    describe('intercept', () => {
        it('should not add auth header for non-API requests', async () => {
            const request = new HttpRequest('GET', 'https://example.com')

            await firstValueFrom(interceptor.intercept(request, mockHttpHandler))
            expect(mockHandleFunction).toHaveBeenCalledWith(request)
        })

        it('should add auth header for API requests when user is logged in', async () => {
            mockUserSubject.next(mockUser)

            const apiUrl = environment.climateActionApiUrl + '/endpoint'
            const request = new HttpRequest('GET', apiUrl)

            await new Promise(resolve => setTimeout(resolve, 100))
            await firstValueFrom(interceptor.intercept(request, mockHttpHandler))
            expect(mockHandleFunction).toHaveBeenCalled()

            const lastCall = mockHandleFunction.mock.calls[mockHandleFunction.mock.calls.length - 1]
            const requestWithAuth = lastCall[0] as HttpRequest<unknown>
            const authHeader = requestWithAuth.headers.get('Authorization')
            expect(authHeader).toBe(mockKeyInfo.key)
        })

        it('should not add auth header when user is not logged in', async () => {
            mockUserSubject.next(null)

            const apiUrl = environment.climateActionApiUrl + '/endpoint'
            const request = new HttpRequest('GET', apiUrl)

            await firstValueFrom(interceptor.intercept(request, mockHttpHandler))
            const lastCall = mockHandleFunction.mock.calls[mockHandleFunction.mock.calls.length - 1]
            const requestWithoutAuth = lastCall[0] as HttpRequest<unknown>
            expect(requestWithoutAuth.headers.has('Authorization')).toBeFalsy()
        })

        it('should handle errors when fetching API key', async () => {
            vi.spyOn(mockAppwriteService, 'getBasicKey').mockImplementation(() => {
                return Promise.reject(new Error('Key fetch error'))
            })

            mockUserSubject.next(mockUser)

            const apiUrl = environment.climateActionApiUrl + '/endpoint'
            const request = new HttpRequest('GET', apiUrl)

            await firstValueFrom(interceptor.intercept(request, mockHttpHandler))
            const lastCall = mockHandleFunction.mock.calls[mockHandleFunction.mock.calls.length - 1]
            const requestWithoutAuth = lastCall[0] as HttpRequest<unknown>
            expect(requestWithoutAuth.headers.has('Authorization')).toBeFalsy()
        })
    })

    describe('auth state management', () => {
        it('should update API key when user state changes', () => {
            mockUserSubject.next(null)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const loadApiKeySpy = vi.spyOn(interceptor as any, 'loadApiKey')

            mockUserSubject.next(mockUser)

            expect(loadApiKeySpy).toHaveBeenCalled()
        })

        it('should clear API key when user logs out', async () => {
            mockUserSubject.next(mockUser)

            await new Promise(resolve => setTimeout(resolve, 100))
            mockUserSubject.next(null)

            const apiUrl = environment.climateActionApiUrl + '/endpoint'
            const request = new HttpRequest('GET', apiUrl)

            await firstValueFrom(interceptor.intercept(request, mockHttpHandler))
            const lastCall = mockHandleFunction.mock.calls[mockHandleFunction.mock.calls.length - 1]
            const requestWithoutAuth = lastCall[0] as HttpRequest<unknown>
            expect(requestWithoutAuth.headers.has('Authorization')).toBeFalsy()
        })
    })
})
