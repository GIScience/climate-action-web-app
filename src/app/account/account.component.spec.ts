import { WritableSignal, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RunSyncService, SyncState } from '@app/persistence/run-sync.service'
import { Models } from 'appwrite'
import { BehaviorSubject } from 'rxjs'
import { getTranslocoTestingModule } from '../../testing/test-helpers'
import { AppwriteService } from '../auth/appwrite.service'
import { DashboardService } from '../dashboard/dashboard.service'
import { TourEngine } from '../dashboard/walkthrough/tour-engine.service'
import { AccountComponent } from './account.component'

describe('AccountComponent', () => {
    let component: AccountComponent
    let fixture: ComponentFixture<AccountComponent>
    let appwriteService: Partial<AppwriteService>
    let dashboardService: Partial<DashboardService>
    let tourEngine: Partial<TourEngine>
    let syncState: WritableSignal<SyncState>
    let runSyncService: Partial<RunSyncService>
    let userSubject: BehaviorSubject<Models.User<Models.Preferences> | null>

    const mockUser: Models.User<Models.Preferences> = {
        $id: '123',
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        name: 'Test User',
        email: 'test@example.com',
        emailVerification: true,
        labels: ['signupCompleted'],
        prefs: {}
    } as Models.User<Models.Preferences>

    beforeEach(async () => {
        userSubject = new BehaviorSubject<Models.User<Models.Preferences> | null>(null)
        appwriteService = {
            _user: userSubject,
            tryToLogin: vi.fn().mockResolvedValue(true),
            tryToLogout: vi.fn().mockResolvedValue(undefined),
            getAppwriteUrl: vi.fn().mockReturnValue('https://example.com'),
            getRedirectUrl: vi.fn().mockReturnValue('https://example.com'),
            loginAsFakeUser: vi.fn().mockResolvedValue(undefined)
        }

        dashboardService = {
            clearDashboardState: vi.fn()
        }

        tourEngine = {
            initializeTour: vi.fn()
        }

        syncState = signal<SyncState>('idle')
        runSyncService = {
            syncState,
            retrySync: vi.fn()
        }

        await TestBed.configureTestingModule({
            imports: [AccountComponent, getTranslocoTestingModule()],
            providers: [
                { provide: AppwriteService, useValue: appwriteService },
                { provide: DashboardService, useValue: dashboardService },
                { provide: TourEngine, useValue: tourEngine },
                { provide: RunSyncService, useValue: runSyncService }
            ]
        }).compileComponents()

        fixture = TestBed.createComponent(AccountComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should update user when service emits new user', () => {
        userSubject.next(mockUser)
        expect(component.user).toEqual(mockUser)
    })

    it('should call tryToLogin on init', async () => {
        await component.ngOnInit()
        expect(appwriteService.tryToLogin).toHaveBeenCalled()
    })

    it('should call tryToLogout when logout is called', async () => {
        await component.logout()
        expect(appwriteService.tryToLogout).toHaveBeenCalled()
    })

    it('should unsubscribe from user subscription on destroy', () => {
        const spy = vi.spyOn(component['userSubscription'], 'unsubscribe')
        component.ngOnDestroy()
        expect(spy).toHaveBeenCalled()
    })
})
