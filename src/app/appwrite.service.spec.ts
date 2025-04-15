import { TestBed } from '@angular/core/testing'
import { MatSnackBar } from '@angular/material/snack-bar'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { environment } from '@environments/environment'
import { Account, Models } from 'appwrite'
import { AppwriteService } from './appwrite.service'

jest.mock('@environments/environment', () => ({
    environment: {
        production: false,
        appwriteEndpoint: 'mock-endpoint',
        appwriteProjectId: 'mock-project-id'
    }
}))

const originalConsoleError = console.error
console.error = jest.fn()

const mockSnackBar = {
    open: jest.fn()
}

jest.mock('appwrite', () => ({
    Account: jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        deleteSession: jest.fn()
    })),
    Client: jest.fn().mockImplementation(() => ({
        setEndpoint: jest.fn().mockReturnThis(),
        setProject: jest.fn().mockReturnThis()
    }))
}))

describe('AppwriteService', () => {
    let service: AppwriteService
    let mockAccount: jest.Mocked<Account>

    const mockUser: Models.User<Models.Preferences> = {
        $id: '123',
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        name: 'Test User',
        email: 'test@example.com',
        emailVerification: true,
        labels: ['signupCompleted'],
        prefs: {},
        registration: new Date().toISOString(),
        status: true,
        passwordUpdate: new Date().toISOString(),
        phone: '',
        phoneVerification: false,
        mfa: false,
        accessedAt: new Date().toISOString()
    } as Models.User<Models.Preferences>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule],
            providers: [{ provide: MatSnackBar, useValue: mockSnackBar }]
        })
        service = TestBed.inject(AppwriteService)
        mockAccount = service['account'] as jest.Mocked<Account>
    })

    afterAll(() => {
        console.error = originalConsoleError
    })

    describe('tryToLogin', () => {
        it('should set user when login is successful', async () => {
            mockAccount.get.mockResolvedValue(mockUser)

            const result = await service.tryToLogin()

            expect(result).toBe(true)
            service._user.subscribe(user => {
                expect(user).toEqual(mockUser)
            })
        })

        it('should handle failed login', async () => {
            mockAccount.get.mockRejectedValue(new Error('Failed to login'))

            const originalProduction = environment.production
            environment.production = true

            const result = await service.tryToLogin()

            environment.production = originalProduction

            expect(result).toBe(false)
            service._user.subscribe(user => {
                expect(user).toBeNull()
            })
        })
    })

    describe('tryToLogout', () => {
        it('should clear user on successful logout', async () => {
            mockAccount.deleteSession.mockResolvedValue({})

            await service.tryToLogout()

            service._user.subscribe(user => {
                expect(user).toBeNull()
            })
        })

        it('should clear user even if logout fails', async () => {
            mockAccount.deleteSession.mockRejectedValue(new Error('Failed to logout'))

            await service.tryToLogout()

            service._user.subscribe(user => {
                expect(user).toBeNull()
            })
            expect(console.error).toHaveBeenCalledWith('Error deleting session:', expect.any(Error))
        })
    })
})
