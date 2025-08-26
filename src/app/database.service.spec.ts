import { TestBed } from '@angular/core/testing'
import { Models } from 'appwrite'
import { BehaviorSubject } from 'rxjs'
import { AppwriteService } from './auth/appwrite.service'
import { DatabaseService } from './database.service'

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
}

interface MockAppwriteService extends Partial<AppwriteService> {
    getDatabases: jest.Mock
    _user: BehaviorSubject<Models.User<Models.Preferences> | null>
}

describe('DatabaseService', () => {
    let service: DatabaseService
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
            updateDocument: jest.fn()
        }

        mockAppwriteService = {
            getDatabases: jest.fn().mockReturnValue(mockDatabases),
            _user: userSubject
        }

        TestBed.configureTestingModule({
            providers: [DatabaseService, { provide: AppwriteService, useValue: mockAppwriteService }]
        })

        service = TestBed.inject(DatabaseService)
    })

    describe('createPluginRun', () => {
        it('should return null if no user is logged in', async () => {
            userSubject.next(null)

            const result = await service.createPluginRun({
                correlation_uuid: 'test-uuid',
                pluginId: 'test-plugin',
                status: 'PENDING',
                timestamp: new Date(),
                flags: [],
                aoiName: 'Test Area'
            })

            expect(result).toBeNull()
            expect(mockDatabases.createDocument).not.toHaveBeenCalled()
        })

        it('should create a plugin run in Appwrite', async () => {
            mockDatabases.createDocument.mockResolvedValue({ $id: 'new-doc-id' })

            const result = await service.createPluginRun({
                correlation_uuid: 'test-uuid',
                pluginId: 'test-plugin',
                status: 'PENDING',
                timestamp: new Date(),
                flags: [],
                aoiName: 'Test Area'
            })

            expect(mockDatabases.createDocument).toHaveBeenCalled()
            expect(result).toBe('new-doc-id')
        })

        it('should handle errors and return null', async () => {
            mockDatabases.createDocument.mockRejectedValue(new Error('Test error'))

            const result = await service.createPluginRun({
                correlation_uuid: 'test-uuid',
                pluginId: 'test-plugin',
                status: 'PENDING',
                timestamp: new Date(),
                flags: [],
                aoiName: 'Test Area'
            })

            expect(result).toBeNull()
        })
    })

    describe('updatePluginRun', () => {
        it('should return false if no user is logged in', async () => {
            userSubject.next(null)

            const result = await service.updatePluginRun('test-uuid', { status: 'SUCCESS' })

            expect(result).toBe(false)
            expect(mockDatabases.listDocuments).not.toHaveBeenCalled()
        })

        it('should update a plugin run in Appwrite', async () => {
            mockDatabases.listDocuments.mockResolvedValue({
                documents: [{ $id: 'doc-id', correlation_uuid: 'test-uuid' }]
            })
            mockDatabases.updateDocument.mockResolvedValue({})

            const result = await service.updatePluginRun('test-uuid', { status: 'SUCCESS' })

            expect(mockDatabases.listDocuments).toHaveBeenCalled()
            expect(mockDatabases.updateDocument).toHaveBeenCalled()
            expect(result).toBe(true)
        })

        it('should return false if document not found', async () => {
            mockDatabases.listDocuments.mockResolvedValue({ documents: [] })

            const result = await service.updatePluginRun('test-uuid', { status: 'SUCCESS' })

            expect(mockDatabases.listDocuments).toHaveBeenCalled()
            expect(mockDatabases.updateDocument).not.toHaveBeenCalled()
            expect(result).toBe(false)
        })

        it('should handle errors and return false', async () => {
            mockDatabases.listDocuments.mockRejectedValue(new Error('Test error'))

            const result = await service.updatePluginRun('test-uuid', { status: 'SUCCESS' })

            expect(result).toBe(false)
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
                total: 0,
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
                'dashboard_data',
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
                    timestamp: mockDocuments[0].timestamp,
                    status: 'SUCCESS',
                    aoiName: 'Test Area 1',
                    flags: undefined
                },
                {
                    correlation_uuid: 'test-uuid-2',
                    pluginId: 'test-plugin',
                    timestamp: mockDocuments[1].timestamp,
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
                'dashboard_data',
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
                    timestamp: mockDocuments[0].timestamp,
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

        it('should filter by state when provided', async () => {
            const mockDocuments = [
                {
                    $id: 'doc-id-1',
                    correlation_uuid: 'test-uuid-1',
                    pluginId: 'test-plugin',
                    timestamp: new Date().toISOString(),
                    status: 'SUCCESS',
                    aoiName: 'Test Area 1',
                    flags: [],
                    state: 'ARCHIVED'
                }
            ]

            mockDatabases.listDocuments.mockResolvedValue({
                documents: mockDocuments
            })

            const result = await service.fetchPluginRunsPaginated({
                limit: 10,
                pluginId: 'test-plugin',
                state: 'ARCHIVED'
            })

            expect(mockDatabases.listDocuments).toHaveBeenCalledWith(
                'climate_action',
                'dashboard_data',
                expect.arrayContaining([
                    expect.stringContaining('"method":"equal"'),
                    expect.stringContaining('"method":"limit"'),
                    expect.stringContaining('"method":"orderDesc"')
                ])
            )
            expect(result.documents).toEqual([
                {
                    correlation_uuid: 'test-uuid-1',
                    pluginId: 'test-plugin',
                    timestamp: mockDocuments[0].timestamp,
                    status: 'SUCCESS',
                    aoiName: 'Test Area 1',
                    flags: [],
                    state: 'ARCHIVED'
                }
            ])
        })
    })
})
