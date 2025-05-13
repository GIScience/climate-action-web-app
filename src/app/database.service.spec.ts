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

    describe('getPluginRuns', () => {
        it('should return empty array if no user is logged in', async () => {
            userSubject.next(null)
            const result = await service.getPluginRuns()
            expect(result).toEqual([])
            expect(mockDatabases.listDocuments).not.toHaveBeenCalled()
        })

        it('should return plugin runs from Appwrite', async () => {
            mockDatabases.listDocuments.mockResolvedValue({
                documents: [
                    {
                        correlation_uuid: 'test-uuid-1',
                        flag: 'NEW',
                        pluginId: 'test-plugin-1',
                        timestamp: new Date().toISOString(),
                        status: 'SUCCESS',
                        aoiName: 'Test Area'
                    },
                    {
                        correlation_uuid: 'test-uuid-2',
                        flag: null,
                        pluginId: 'test-plugin-2',
                        timestamp: new Date().toISOString(),
                        status: 'PENDING',
                        aoiName: 'Another Area'
                    }
                ]
            })

            const result = await service.getPluginRuns()

            expect(mockDatabases.listDocuments).toHaveBeenCalled()
            expect(result.length).toBe(2)
            expect(result[0].correlation_uuid).toBe('test-uuid-1')
            expect(result[1].correlation_uuid).toBe('test-uuid-2')
        })

        it('should handle errors and return empty array', async () => {
            mockDatabases.listDocuments.mockRejectedValue(new Error('Test error'))

            const result = await service.getPluginRuns()

            expect(result).toEqual([])
        })
    })

    describe('createPluginRun', () => {
        it('should return null if no user is logged in', async () => {
            userSubject.next(null)

            const result = await service.createPluginRun({
                correlation_uuid: 'test-uuid',
                pluginId: 'test-plugin',
                status: 'PENDING',
                timestamp: new Date(),
                flag: null,
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
                flag: null,
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
                flag: null,
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

    describe('syncPluginRuns', () => {
        it('should return false if no user is logged in', async () => {
            userSubject.next(null)

            const result = await service.syncPluginRuns([])

            expect(result).toBe(false)
        })

        it('should sync plugin runs with Appwrite', async () => {
            jest.spyOn(service, 'getPluginRuns').mockResolvedValue([
                {
                    correlation_uuid: 'existing-uuid',
                    pluginId: 'test-plugin',
                    status: 'PENDING',
                    timestamp: new Date(),
                    flag: null,
                    aoiName: 'Test Area'
                }
            ])

            jest.spyOn(service, 'updatePluginRun').mockResolvedValue(true)
            jest.spyOn(service, 'createPluginRun').mockResolvedValue('new-doc-id')

            const result = await service.syncPluginRuns([
                {
                    correlation_uuid: 'existing-uuid',
                    pluginId: 'test-plugin',
                    status: 'SUCCESS',
                    timestamp: new Date(),
                    flag: null,
                    aoiName: 'Test Area'
                },
                {
                    correlation_uuid: 'new-uuid',
                    pluginId: 'test-plugin-2',
                    status: 'PENDING',
                    timestamp: new Date(),
                    flag: null,
                    aoiName: 'Another Area'
                }
            ])

            expect(result).toBe(true)
            expect(service.updatePluginRun).toHaveBeenCalledWith('existing-uuid', expect.anything())
            expect(service.createPluginRun).toHaveBeenCalledWith(
                expect.objectContaining({ correlation_uuid: 'new-uuid' })
            )
        })

        it('should handle errors and return false', async () => {
            jest.spyOn(service, 'getPluginRuns').mockRejectedValue(new Error('Test error'))

            const result = await service.syncPluginRuns([])

            expect(result).toBe(false)
        })
    })
})
