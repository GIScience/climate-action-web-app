import { EventEmitter } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { AppwriteDbService } from '@app/persistence/appwrite-db.service'
import { TranslocoService } from '@jsverse/transloco'
import { Models } from 'appwrite'
import { IDBFactory } from 'fake-indexeddb'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, of } from 'rxjs'
import { AppwriteService } from './auth/appwrite.service'
import { ComputationDatabaseEntity } from './dashboard/computations-index/computation.interface'
import { RunSyncService } from './persistence/run-sync.service'
import { OutboxOp, RunsDbService } from './persistence/runs-db.service'
import { StorageService } from './storage.service'

type EnqueuedOp = Pick<OutboxOp, 'op' | 'correlation_uuid' | 'payload'>

const realUser = { $id: 'real-user-id', email: 'user@example.com' } as Models.User<Models.Preferences>

function makeRun(uuid: string, overrides: Partial<ComputationDatabaseEntity> = {}): ComputationDatabaseEntity {
    return {
        correlation_uuid: uuid,
        request_ts: new Date('2026-01-01T00:00:00Z'),
        status: 'SUCCESS',
        aoiName: 'Test Area',
        pluginId: 'test_plugin',
        flags: [],
        ...overrides
    }
}

describe('StorageService', () => {
    let runsDb: RunsDbService
    let userSubject: BehaviorSubject<Models.User<Models.Preferences> | null>
    let onLogout: EventEmitter<void>
    let mockAppwriteService: {
        _user: BehaviorSubject<Models.User<Models.Preferences> | null>
        onLogout: EventEmitter<void>
        registerBeforeLogout: jest.Mock
        tryToLogin: jest.Mock
    }
    let mockAppwriteDb: { fetchPluginRunsPaginated: jest.Mock }
    let mockRunSyncService: { commit: jest.Mock; scheduleDrain: jest.Mock; drainNow: jest.Mock }
    let mockToastrService: { error: jest.Mock }

    beforeEach(() => {
        // Fresh IndexedDB and localStorage per test
        globalThis.indexedDB = new IDBFactory()
        localStorage.clear()

        userSubject = new BehaviorSubject<Models.User<Models.Preferences> | null>(null)
        onLogout = new EventEmitter<void>()
        mockAppwriteService = {
            _user: userSubject,
            onLogout,
            registerBeforeLogout: jest.fn(),
            tryToLogin: jest.fn().mockResolvedValue(false)
        }
        mockAppwriteDb = {
            fetchPluginRunsPaginated: jest.fn().mockResolvedValue({ documents: [], total: 0, hasMore: false })
        }
        mockRunSyncService = {
            commit: jest.fn().mockResolvedValue(undefined),
            scheduleDrain: jest.fn(),
            drainNow: jest.fn().mockResolvedValue(undefined)
        }
        mockToastrService = { error: jest.fn() }

        TestBed.configureTestingModule({
            providers: [
                StorageService,
                RunsDbService,
                { provide: AppwriteService, useValue: mockAppwriteService },
                { provide: AppwriteDbService, useValue: mockAppwriteDb },
                { provide: RunSyncService, useValue: mockRunSyncService },
                { provide: TranslocoService, useValue: { selectTranslate: jest.fn(() => of('Storage unavailable')) } },
                { provide: ToastrService, useValue: mockToastrService }
            ]
        })

        runsDb = TestBed.inject(RunsDbService)
        mockRunSyncService.commit.mockImplementation((op: EnqueuedOp) => runsDb.commitOp({ ...op, attempts: 0 }))
    })

    async function createService(): Promise<StorageService> {
        const service = TestBed.inject(StorageService)
        await service.ready
        return service
    }

    describe('hydration', () => {
        it('should hydrate the subject from IndexedDB on startup', async () => {
            await runsDb.putRuns([makeRun('uuid-1')])

            const service = await createService()

            expect(service.getPluginRuns().map(run => run.correlation_uuid)).toEqual(['uuid-1'])
            expect(mockRunSyncService.scheduleDrain).toHaveBeenCalled()
        })

        it('should finish a logout wipe that the page reload cut short', async () => {
            await runsDb.commitOp({
                op: 'upsert',
                correlation_uuid: 'uuid-1',
                payload: makeRun('uuid-1'),
                attempts: 0
            })
            localStorage.setItem('runs_wipe_pending', 'true')

            const service = await createService()

            expect(service.getPluginRuns()).toEqual([])
            expect(await runsDb.countOps()).toBe(0)
            expect(localStorage.getItem('runs_wipe_pending')).toBeNull()
        })

        it('toast an error when IndexedDB is unavailable', async () => {
            jest.spyOn(runsDb, 'getAllRuns').mockRejectedValue(new Error('IndexedDB is not available'))
            const consoleError = jest.spyOn(console, 'error').mockImplementation()

            const service = await createService()
            // The toast is shown from a setTimeout, so wait for it
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(service.getPluginRuns()).toEqual([])
            expect(mockToastrService.error).toHaveBeenCalledWith('Storage unavailable')
            expect(mockRunSyncService.scheduleDrain).not.toHaveBeenCalled()
            consoleError.mockRestore()
        })
    })

    describe('local-first writes', () => {
        it('should store a new compute locally and commit an upsert op', async () => {
            const service = await createService()
            const run = makeRun('uuid-1')

            await service.storeNewCompute(run)

            expect(service.getPluginRuns()).toContainEqual(run)
            expect((await runsDb.getAllRuns()).map(r => r.correlation_uuid)).toEqual(['uuid-1'])
            expect(mockRunSyncService.commit).toHaveBeenCalledWith({
                op: 'upsert',
                correlation_uuid: 'uuid-1',
                payload: run
            })
            expect(mockAppwriteDb.fetchPluginRunsPaginated).not.toHaveBeenCalled()
        })

        it('should update a run locally and commit the full merged snapshot', async () => {
            const service = await createService()
            await service.storeNewCompute(makeRun('uuid-1', { status: 'PENDING' }))
            mockRunSyncService.commit.mockClear()

            await service.updateComputation('uuid-1', { status: 'SUCCESS' })

            expect(service.getPluginRuns()[0].status).toBe('SUCCESS')
            expect((await runsDb.getAllRuns())[0].status).toBe('SUCCESS')
            expect(mockRunSyncService.commit).toHaveBeenCalledWith({
                op: 'upsert',
                correlation_uuid: 'uuid-1',
                // The full run, not just the changed fields
                payload: expect.objectContaining({ status: 'SUCCESS', aoiName: 'Test Area', pluginId: 'test_plugin' })
            })
        })

        it('should not commit anything when updating an unknown run', async () => {
            const service = await createService()

            await service.updateComputation('missing-uuid', { status: 'SUCCESS' })

            expect(mockRunSyncService.commit).not.toHaveBeenCalled()
        })

        it('should delete a run locally and commit a delete op', async () => {
            const service = await createService()
            await service.storeNewCompute(makeRun('uuid-1'))
            mockRunSyncService.commit.mockClear()

            await service.deleteComputation('uuid-1')

            expect(service.getPluginRuns()).toEqual([])
            expect(await runsDb.getAllRuns()).toEqual([])
            expect(mockRunSyncService.commit).toHaveBeenCalledWith({ op: 'delete', correlation_uuid: 'uuid-1' })
        })
    })

    describe('logout', () => {
        it('should register a before-logout drain hook', async () => {
            await createService()

            expect(mockAppwriteService.registerBeforeLogout).toHaveBeenCalledWith(expect.any(Function))
            const hook = mockAppwriteService.registerBeforeLogout.mock.calls[0][0]
            await hook()
            expect(mockRunSyncService.drainNow).toHaveBeenCalled()
        })

        it('should wipe local runs and the outbox on logout', async () => {
            const service = await createService()
            await service.storeNewCompute(makeRun('uuid-1'))

            onLogout.emit()
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(service.getPluginRuns()).toEqual([])
            expect(await runsDb.getAllRuns()).toEqual([])
            expect(await runsDb.countOps()).toBe(0)
        })
    })

    describe('owner change', () => {
        it('should wipe data left behind by another account when a different user logs in', async () => {
            localStorage.setItem('runs_owner', JSON.stringify('previous-user-id'))
            await runsDb.commitOp({
                op: 'upsert',
                correlation_uuid: 'uuid-1',
                payload: makeRun('uuid-1'),
                attempts: 0
            })
            const service = await createService()

            userSubject.next(realUser)
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(service.getPluginRuns()).toEqual([])
            expect(await runsDb.getAllRuns()).toEqual([])
            expect(await runsDb.countOps()).toBe(0)
            expect(localStorage.getItem('runs_owner')).toBe(JSON.stringify(realUser.$id))
        })
    })

    describe('getPluginRunsPaginated', () => {
        it('should serve anonymous users entirely from local data', async () => {
            const service = await createService()
            await service.storeNewCompute(makeRun('uuid-1'))
            await service.storeNewCompute(makeRun('other-plugin-uuid', { pluginId: 'other_plugin' }))

            const result = await service.getPluginRunsPaginated('test_plugin')

            expect(result.documents.map(run => run.correlation_uuid)).toEqual(['uuid-1'])
            expect(result.hasMore).toBe(false)
            expect(mockAppwriteDb.fetchPluginRunsPaginated).not.toHaveBeenCalled()
        })

        it('should merge a server page into local state instead of replacing it', async () => {
            const service = await createService()
            userSubject.next(realUser)
            const localOnly = makeRun('local-only-uuid')
            await service.storeNewCompute(localOnly)
            mockAppwriteDb.fetchPluginRunsPaginated.mockResolvedValue({
                documents: [makeRun('server-uuid')],
                total: 1,
                hasMore: false
            })

            const result = await service.getPluginRunsPaginated('test_plugin')

            expect(result.documents.map(run => run.correlation_uuid)).toEqual(['server-uuid'])
            // The local-only run survived the initial page load
            const allUuids = service.getPluginRuns().map(run => run.correlation_uuid)
            expect(allUuids).toContain('local-only-uuid')
            expect(allUuids).toContain('server-uuid')
        })

        it('should never demote a local status with a stale server status', async () => {
            const service = await createService()
            userSubject.next(realUser)
            await service.storeNewCompute(makeRun('uuid-1', { status: 'SUCCESS' }))
            // Drop the pending upsert to act as if it had already been drained
            await runsDb.deleteOp((await runsDb.peekFirstOp())!.id)
            mockAppwriteDb.fetchPluginRunsPaginated.mockResolvedValue({
                documents: [makeRun('uuid-1', { status: 'PENDING', aoiName: 'Server Area' })],
                total: 1,
                hasMore: false
            })

            await service.getPluginRunsPaginated('test_plugin')

            // Merged in place, not appended as a duplicate
            expect(service.getPluginRuns()).toHaveLength(1)
            const run = service.getPluginRuns()[0]
            expect(run.status).toBe('SUCCESS')
            // Non-status fields still take the server value
            expect(run.aoiName).toBe('Server Area')
        })

        it('should not resurrect a run whose delete op is still pending', async () => {
            const service = await createService()
            userSubject.next(realUser)
            await service.storeNewCompute(makeRun('deleted-uuid'))
            await service.deleteComputation('deleted-uuid')
            mockAppwriteDb.fetchPluginRunsPaginated.mockResolvedValue({
                documents: [makeRun('deleted-uuid')],
                total: 1,
                hasMore: false
            })

            const result = await service.getPluginRunsPaginated('test_plugin')

            expect(result.documents).toEqual([])
            expect(service.getPluginRuns()).toEqual([])
        })

        it('should let a run with a pending upsert op win over server state', async () => {
            const service = await createService()
            userSubject.next(realUser)
            await service.storeNewCompute(makeRun('uuid-1', { aoiName: 'Local Area' }))
            mockAppwriteDb.fetchPluginRunsPaginated.mockResolvedValue({
                documents: [makeRun('uuid-1', { aoiName: 'Server Area' })],
                total: 1,
                hasMore: false
            })

            await service.getPluginRunsPaginated('test_plugin')

            expect(service.getPluginRuns()[0].aoiName).toBe('Local Area')
        })
    })
})
