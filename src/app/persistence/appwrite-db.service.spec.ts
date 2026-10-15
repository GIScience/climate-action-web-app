import { TestBed } from '@angular/core/testing'
import { AppwriteService } from '@app/auth/appwrite.service'
import { Models } from 'appwrite'
import { BehaviorSubject } from 'rxjs'
import { AppwriteDbService } from './appwrite-db.service'

const originalConsoleError = console.error
beforeAll(() => {
    console.error = jest.fn()
})

afterAll(() => {
    console.error = originalConsoleError
})

interface MockDatabase {
    listDocuments: jest.Mock
    createDocument: jest.Mock
    updateDocument: jest.Mock
    deleteDocument: jest.Mock
}

interface MockAppwriteService extends Partial<AppwriteService> {
    getDatabases: jest.Mock
    _user: BehaviorSubject<Models.User<Models.Preferences> | null>
}

describe('AppwriteDbService', () => {
    let service: AppwriteDbService
    let mockAppwriteService: MockAppwriteService
    let mockDatabases: MockDatabase
    let userSubject: BehaviorSubject<Models.User<Models.Preferences> | null>

    const mockUser = {
        $id: 'test-user-id',
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        name: 'Test User',
        email: 'test@example.com',
        emailVerification: true,
        labels: [],
        prefs: {},
        targets: [],
        status: true,
        passwordUpdate: new Date().toISOString(),
        registration: new Date().toISOString(),
        phone: '',
        phoneVerification: false,
        mfa: false,
        accessedAt: new Date().toISOString()
    } as unknown as Models.User<Models.Preferences>

    beforeEach(() => {
        userSubject = new BehaviorSubject<Models.User<Models.Preferences> | null>(mockUser)

        mockDatabases = {
            listDocuments: jest.fn(),
            createDocument: jest.fn(),
            updateDocument: jest.fn(),
            deleteDocument: jest.fn()
        }

        mockAppwriteService = {
            getDatabases: jest.fn().mockReturnValue(mockDatabases),
            _user: userSubject
        }

        TestBed.configureTestingModule({
            providers: [AppwriteDbService, { provide: AppwriteService, useValue: mockAppwriteService }]
        })

        service = TestBed.inject(AppwriteDbService)
    })

    const testRun = {
        correlation_uuid: 'test-uuid',
        pluginId: 'test-plugin',
        status: 'PENDING' as const,
        request_ts: new Date(),
        flags: [],
        aoiName: 'Test Area'
    }

    describe('ensurePluginRun', () => {
        it('should throw if no user is logged in', async () => {
            userSubject.next(null)

            await expect(service.ensurePluginRun(testRun)).rejects.toThrow()
            expect(mockDatabases.listDocuments).not.toHaveBeenCalled()
        })

        it('should create the document when none exists for the run', async () => {
            mockDatabases.listDocuments.mockResolvedValue({ documents: [] })
            mockDatabases.createDocument.mockResolvedValue({ $id: 'new-doc-id' })

            await service.ensurePluginRun(testRun)

            expect(mockDatabases.updateDocument).not.toHaveBeenCalled()
            expect(mockDatabases.createDocument).toHaveBeenCalledWith(
                'climate_action',
                'staging-dashboard_data',
                expect.any(String),
                expect.objectContaining({
                    correlation_uuid: 'test-uuid',
                    timestamp: testRun.request_ts,
                    user_id: 'test-user-id'
                }),
                expect.any(Array)
            )
        })

        it('should update the existing document when one exists for the run', async () => {
            mockDatabases.listDocuments.mockResolvedValue({
                documents: [{ $id: 'doc-id', correlation_uuid: 'test-uuid' }]
            })
            mockDatabases.updateDocument.mockResolvedValue({})

            await service.ensurePluginRun({ ...testRun, status: 'SUCCESS' })

            expect(mockDatabases.createDocument).not.toHaveBeenCalled()
            expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
                'climate_action',
                'staging-dashboard_data',
                'doc-id',
                expect.objectContaining({ status: 'SUCCESS', timestamp: testRun.request_ts })
            )
        })

        it('should propagate transport errors so the outbox retries', async () => {
            mockDatabases.listDocuments.mockRejectedValue(new Error('Network down'))

            await expect(service.ensurePluginRun(testRun)).rejects.toThrow('Network down')
        })
    })

    describe('removePluginRun', () => {
        it('should throw if no user is logged in', async () => {
            userSubject.next(null)

            await expect(service.removePluginRun('test-uuid')).rejects.toThrow()
            expect(mockDatabases.listDocuments).not.toHaveBeenCalled()
        })

        it('should delete the document when it exists', async () => {
            mockDatabases.listDocuments.mockResolvedValue({
                documents: [{ $id: 'doc-id', correlation_uuid: 'test-uuid' }]
            })
            mockDatabases.deleteDocument.mockResolvedValue({})

            await service.removePluginRun('test-uuid')

            expect(mockDatabases.deleteDocument).toHaveBeenCalledWith(
                'climate_action',
                'staging-dashboard_data',
                'doc-id'
            )
        })

        it('should treat an already-missing document as success', async () => {
            mockDatabases.listDocuments.mockResolvedValue({ documents: [] })

            await expect(service.removePluginRun('test-uuid')).resolves.toBeUndefined()
            expect(mockDatabases.deleteDocument).not.toHaveBeenCalled()
        })

        it('should propagate transport errors so the outbox retries', async () => {
            mockDatabases.listDocuments.mockResolvedValue({
                documents: [{ $id: 'doc-id', correlation_uuid: 'test-uuid' }]
            })
            mockDatabases.deleteDocument.mockRejectedValue(new Error('Network down'))

            await expect(service.removePluginRun('test-uuid')).rejects.toThrow('Network down')
        })
    })

    describe('fetchPluginRunsPaginated', () => {
        it('should return empty result if no user is logged in', async () => {
            userSubject.next(null)

            const result = await service.fetchPluginRunsPaginated({
                limit: 10,
                pluginId: 'test-plugin'
            })

            expect(result).toEqual({
                documents: [],
                hasMore: false
            })
            expect(mockDatabases.listDocuments).not.toHaveBeenCalled()
        })

        it('should return paginated results for first page', async () => {
            const mockDocuments = [
                {
                    $id: 'doc-id-1',
                    correlation_uuid: 'test-uuid-1',
                    pluginId: 'test-plugin',
                    timestamp: new Date().toISOString(),
                    status: 'SUCCESS',
                    aoiName: 'Test Area 1'
                },
                {
                    $id: 'doc-id-2',
                    correlation_uuid: 'test-uuid-2',
                    pluginId: 'test-plugin',
                    timestamp: new Date().toISOString(),
                    status: 'PENDING',
                    aoiName: 'Test Area 2'
                }
            ]

            mockDatabases.listDocuments.mockResolvedValue({
                documents: mockDocuments
            })

            const result = await service.fetchPluginRunsPaginated({
                limit: 2,
                pluginId: 'test-plugin'
            })

            expect(mockDatabases.listDocuments).toHaveBeenCalledWith(
                'climate_action',
                'staging-dashboard_data',
                expect.arrayContaining([
                    expect.stringContaining('"method":"equal"'),
                    expect.stringContaining('"method":"limit"'),
                    expect.stringContaining('"method":"orderDesc"'),
                    expect.stringContaining('"attribute":"pluginId"')
                ])
            )
            expect(result.documents).toEqual([
                {
                    correlation_uuid: 'test-uuid-1',
                    pluginId: 'test-plugin',
                    request_ts: mockDocuments[0].timestamp,
                    status: 'SUCCESS',
                    aoiName: 'Test Area 1',
                    flags: undefined
                },
                {
                    correlation_uuid: 'test-uuid-2',
                    pluginId: 'test-plugin',
                    request_ts: mockDocuments[1].timestamp,
                    status: 'PENDING',
                    aoiName: 'Test Area 2',
                    flags: undefined
                }
            ])
            expect(result.hasMore).toBe(true)
            expect(result.nextCursor).toBe('doc-id-2')
        })

        it('should return paginated results with cursor for subsequent pages', async () => {
            const mockDocuments = [
                {
                    $id: 'doc-id-3',
                    correlation_uuid: 'test-uuid-3',
                    pluginId: 'test-plugin',
                    timestamp: new Date().toISOString(),
                    status: 'SUCCESS',
                    aoiName: 'Test Area 3'
                }
            ]

            mockDatabases.listDocuments.mockResolvedValue({
                documents: mockDocuments
            })

            const result = await service.fetchPluginRunsPaginated({
                limit: 1,
                cursor: 'test-uuid-2',
                pluginId: 'test-plugin'
            })

            expect(mockDatabases.listDocuments).toHaveBeenCalledWith(
                'climate_action',
                'staging-dashboard_data',
                expect.arrayContaining([
                    expect.stringContaining('"method":"equal"'),
                    expect.stringContaining('"method":"limit"'),
                    expect.stringContaining('"method":"orderDesc"'),
                    expect.stringContaining('"method":"cursorAfter"')
                ])
            )
            expect(result.documents).toEqual([
                {
                    correlation_uuid: 'test-uuid-3',
                    pluginId: 'test-plugin',
                    request_ts: mockDocuments[0].timestamp,
                    status: 'SUCCESS',
                    aoiName: 'Test Area 3',
                    flags: undefined
                }
            ])
            expect(result.hasMore).toBe(true)
            expect(result.nextCursor).toBe('doc-id-3')
        })

        it('should handle last page correctly', async () => {
            mockDatabases.listDocuments.mockResolvedValue({
                documents: []
            })

            const result = await service.fetchPluginRunsPaginated({
                limit: 10,
                cursor: 'last-uuid',
                pluginId: 'test-plugin'
            })

            expect(result.documents).toEqual([])
            expect(result.hasMore).toBe(false)
            expect(result.nextCursor).toBeUndefined()
        })
    })
})
