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

interface MockTablesDB {
    listRows: jest.Mock
    createRow: jest.Mock
    updateRow: jest.Mock
    deleteRow: jest.Mock
}

interface MockAppwriteService extends Partial<AppwriteService> {
    getTablesDB: jest.Mock
    _user: BehaviorSubject<Models.User<Models.Preferences> | null>
}

describe('AppwriteDbService', () => {
    let service: AppwriteDbService
    let mockAppwriteService: MockAppwriteService
    let mockTablesDB: MockTablesDB
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

        mockTablesDB = {
            listRows: jest.fn(),
            createRow: jest.fn(),
            updateRow: jest.fn(),
            deleteRow: jest.fn()
        }

        mockAppwriteService = {
            getTablesDB: jest.fn().mockReturnValue(mockTablesDB),
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
            expect(mockTablesDB.listRows).not.toHaveBeenCalled()
        })

        it('should create the document when none exists for the run', async () => {
            mockTablesDB.listRows.mockResolvedValue({ rows: [] })
            mockTablesDB.createRow.mockResolvedValue({ $id: 'new-doc-id' })

            await service.ensurePluginRun(testRun)

            expect(mockTablesDB.updateRow).not.toHaveBeenCalled()
            expect(mockTablesDB.createRow).toHaveBeenCalledWith({
                databaseId: 'climate_action',
                tableId: 'staging-dashboard_data',
                rowId: expect.any(String),
                data: expect.objectContaining({
                    correlation_uuid: 'test-uuid',
                    timestamp: testRun.request_ts,
                    user_id: 'test-user-id'
                }),
                permissions: expect.any(Array)
            })
        })

        it('should update the existing document when one exists for the run', async () => {
            mockTablesDB.listRows.mockResolvedValue({
                rows: [{ $id: 'doc-id', correlation_uuid: 'test-uuid' }]
            })
            mockTablesDB.updateRow.mockResolvedValue({})

            await service.ensurePluginRun({ ...testRun, status: 'SUCCESS' })

            expect(mockTablesDB.createRow).not.toHaveBeenCalled()
            expect(mockTablesDB.updateRow).toHaveBeenCalledWith({
                databaseId: 'climate_action',
                tableId: 'staging-dashboard_data',
                rowId: 'doc-id',
                data: expect.objectContaining({ status: 'SUCCESS', timestamp: testRun.request_ts })
            })
        })

        it('should propagate transport errors so the outbox retries', async () => {
            mockTablesDB.listRows.mockRejectedValue(new Error('Network down'))

            await expect(service.ensurePluginRun(testRun)).rejects.toThrow('Network down')
        })
    })

    describe('removePluginRun', () => {
        it('should throw if no user is logged in', async () => {
            userSubject.next(null)

            await expect(service.removePluginRun('test-uuid')).rejects.toThrow()
            expect(mockTablesDB.listRows).not.toHaveBeenCalled()
        })

        it('should delete the document when it exists', async () => {
            mockTablesDB.listRows.mockResolvedValue({
                rows: [{ $id: 'doc-id', correlation_uuid: 'test-uuid' }]
            })
            mockTablesDB.deleteRow.mockResolvedValue({})

            await service.removePluginRun('test-uuid')

            expect(mockTablesDB.deleteRow).toHaveBeenCalledWith({
                databaseId: 'climate_action',
                tableId: 'staging-dashboard_data',
                rowId: 'doc-id'
            })
        })

        it('should treat an already-missing document as success', async () => {
            mockTablesDB.listRows.mockResolvedValue({ rows: [] })

            await expect(service.removePluginRun('test-uuid')).resolves.toBeUndefined()
            expect(mockTablesDB.deleteRow).not.toHaveBeenCalled()
        })

        it('should propagate transport errors so the outbox retries', async () => {
            mockTablesDB.listRows.mockResolvedValue({
                rows: [{ $id: 'doc-id', correlation_uuid: 'test-uuid' }]
            })
            mockTablesDB.deleteRow.mockRejectedValue(new Error('Network down'))

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
            expect(mockTablesDB.listRows).not.toHaveBeenCalled()
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

            mockTablesDB.listRows.mockResolvedValue({
                rows: mockDocuments
            })

            const result = await service.fetchPluginRunsPaginated({
                limit: 2,
                pluginId: 'test-plugin'
            })

            expect(mockTablesDB.listRows).toHaveBeenCalledWith({
                databaseId: 'climate_action',
                tableId: 'staging-dashboard_data',
                queries: expect.arrayContaining([
                    expect.stringContaining('"method":"equal"'),
                    expect.stringContaining('"method":"limit"'),
                    expect.stringContaining('"method":"orderDesc"'),
                    expect.stringContaining('"attribute":"pluginId"')
                ])
            })
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

            mockTablesDB.listRows.mockResolvedValue({
                rows: mockDocuments
            })

            const result = await service.fetchPluginRunsPaginated({
                limit: 1,
                cursor: 'test-uuid-2',
                pluginId: 'test-plugin'
            })

            expect(mockTablesDB.listRows).toHaveBeenCalledWith({
                databaseId: 'climate_action',
                tableId: 'staging-dashboard_data',
                queries: expect.arrayContaining([
                    expect.stringContaining('"method":"equal"'),
                    expect.stringContaining('"method":"limit"'),
                    expect.stringContaining('"method":"orderDesc"'),
                    expect.stringContaining('"method":"cursorAfter"')
                ])
            })
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
            mockTablesDB.listRows.mockResolvedValue({
                rows: []
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
