import { TestBed } from '@angular/core/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { environment } from '@environments/environment'
import { Account, Models } from 'appwrite'
import { MockInstance } from 'vitest'
import { AppwriteService } from './appwrite.service'

const originalConsoleError = console.error
const originalConsoleWarn = console.warn
beforeAll(() => {
    console.error = vi.fn()
    console.warn = vi.fn()
})

afterAll(() => {
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
})

describe('AppwriteService', () => {
    let service: AppwriteService

    const mockUser = {
        $id: '123',
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        name: 'Test User',
        email: 'test@example.com',
        emailVerification: true,
        labels: ['signupCompleted'],
        prefs: {},
        targets: [],
        registration: new Date().toISOString(),
        status: true,
        passwordUpdate: new Date().toISOString(),
        phone: '',
        phoneVerification: false,
        mfa: false,
        accessedAt: new Date().toISOString()
    } as unknown as Models.User<Models.Preferences>

    // The SDK is real; the two calls that would reach the network are stubbed on the prototype
    let accountGet: MockInstance<Account['get']>
    let accountDeleteSession: MockInstance<Account['deleteSession']>

    beforeEach(() => {
        accountGet = vi.spyOn(Account.prototype, 'get').mockResolvedValue(undefined as never)
        accountDeleteSession = vi.spyOn(Account.prototype, 'deleteSession').mockResolvedValue(undefined as never)

        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule]
        })
        service = TestBed.inject(AppwriteService)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('tryToLogin', () => {
        it('should set user when login is successful', async () => {
            accountGet.mockResolvedValue(mockUser)

            const result = await service.tryToLogin()

            expect(result).toBe(true)
            service._user.subscribe(user => {
                expect(user).toEqual(mockUser)
            })
        })

        it('should handle failed login', async () => {
            accountGet.mockRejectedValue(new Error('Failed to login'))

            const originalEnvironmentType = environment.environmentType
            environment.environmentType = 'production'

            const result = await service.tryToLogin()

            environment.environmentType = originalEnvironmentType

            expect(result).toBe(false)
            service._user.subscribe(user => {
                expect(user).toBeNull()
            })
        })
    })

    describe('tryToLogout', () => {
        it('should clear user on successful logout', async () => {
            accountDeleteSession.mockResolvedValue({})

            await service.tryToLogout()

            service._user.subscribe(user => {
                expect(user).toBeNull()
            })
        })

        it('should clear user even if logout fails', async () => {
            accountDeleteSession.mockRejectedValue(new Error('Failed to logout'))

            await service.tryToLogout()

            service._user.subscribe(user => {
                expect(user).toBeNull()
            })
            expect(console.error).toHaveBeenCalledWith('Error deleting session:', expect.any(Error))
        })
    })

    describe('getTablesDB', () => {
        it('should return the TablesDB instance', () => {
            const tablesDB = service.getTablesDB()
            expect(tablesDB).toBeDefined()
        })
    })
})
