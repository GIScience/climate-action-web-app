import { TestBed } from '@angular/core/testing'
import { AppwriteService } from '@app/auth/appwrite.service'
import { ComputationDatabaseEntity } from '@app/dashboard/computations-index/computation.interface'
import { Models } from 'appwrite'
import { IDBFactory } from 'fake-indexeddb'
import { BehaviorSubject } from 'rxjs'
import { Mock, MockInstance } from 'vitest'
import { AppwriteDbService } from './appwrite-db.service'
import { RunSyncService } from './run-sync.service'
import { RunsDbService } from './runs-db.service'

const realUser = { $id: 'real-user-id', email: 'user@example.com' } as Models.User<Models.Preferences>

function makeRun(uuid: string): ComputationDatabaseEntity {
    return {
        correlation_uuid: uuid,
        request_ts: new Date('2026-01-01T00:00:00Z'),
        status: 'SUCCESS',
        aoiName: 'Test Area',
        pluginId: 'test_plugin',
        flags: []
    }
}

describe('RunSyncService', () => {
    let service: RunSyncService
    let runsDb: RunsDbService
    let userSubject: BehaviorSubject<Models.User<Models.Preferences> | null>
    let mockAppwriteDb: { ensurePluginRun: Mock; removePluginRun: Mock }

    function setup(initialUser: Models.User<Models.Preferences> | null = null): void {
        userSubject = new BehaviorSubject<Models.User<Models.Preferences> | null>(initialUser)
        mockAppwriteDb = {
            ensurePluginRun: vi.fn().mockResolvedValue(undefined),
            removePluginRun: vi.fn().mockResolvedValue(undefined)
        }

        TestBed.configureTestingModule({
            providers: [
                RunSyncService,
                RunsDbService,
                { provide: AppwriteService, useValue: { _user: userSubject } },
                { provide: AppwriteDbService, useValue: mockAppwriteDb }
            ]
        })

        runsDb = TestBed.inject(RunsDbService)
        service = TestBed.inject(RunSyncService)
    }

    beforeEach(() => {
        globalThis.indexedDB = new IDBFactory()
        // Leave setImmediate and microtasks real: the IndexedDB work below depends on them
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // Advancing the fake timers only starts a drain. Its IndexedDB work uses
    // the real setImmediate, so keep yielding until that has finished too.
    async function advanceTimersAndSettle(ms: number): Promise<void> {
        await vi.advanceTimersByTimeAsync(ms)
        for (let i = 0; i < 200; i++) {
            await new Promise(resolve => setImmediate(resolve))
        }
    }

    it('should accumulate ops while anonymous and drain them when a real user logs in', async () => {
        setup(null)

        await service.commit({ op: 'upsert', correlation_uuid: 'uuid-1', payload: makeRun('uuid-1') })
        await advanceTimersAndSettle(1000)

        expect(mockAppwriteDb.ensurePluginRun).not.toHaveBeenCalled()
        expect(service.syncState()).toBe('pending')

        userSubject.next(realUser)
        await advanceTimersAndSettle(1000)

        expect(mockAppwriteDb.ensurePluginRun).toHaveBeenCalledWith(
            expect.objectContaining({ correlation_uuid: 'uuid-1' })
        )
        expect(service.syncState()).toBe('idle')
    })

    it('should drain serially in FIFO order', async () => {
        setup(realUser)
        const callOrder: string[] = []
        mockAppwriteDb.ensurePluginRun.mockImplementation(async (run: ComputationDatabaseEntity) => {
            callOrder.push(`upsert:${run.correlation_uuid}`)
        })
        mockAppwriteDb.removePluginRun.mockImplementation(async (uuid: string) => {
            callOrder.push(`delete:${uuid}`)
        })

        await service.commit({ op: 'upsert', correlation_uuid: 'uuid-1', payload: makeRun('uuid-1') })
        await service.commit({ op: 'upsert', correlation_uuid: 'uuid-2', payload: makeRun('uuid-2') })
        await service.commit({ op: 'delete', correlation_uuid: 'uuid-3' })
        await advanceTimersAndSettle(1000)

        expect(callOrder).toEqual(['upsert:uuid-1', 'upsert:uuid-2', 'delete:uuid-3'])
        expect(await runsDb.countOps()).toBe(0)
    })

    it('should keep a failed op, back off, and retry it', async () => {
        setup(realUser)
        mockAppwriteDb.ensurePluginRun.mockRejectedValueOnce(new Error('Network down'))

        await service.commit({ op: 'upsert', correlation_uuid: 'uuid-1', payload: makeRun('uuid-1') })
        await advanceTimersAndSettle(600)

        expect(mockAppwriteDb.ensurePluginRun).toHaveBeenCalledTimes(1)
        expect(service.syncState()).toBe('pending')

        // The first retry runs after 5s and succeeds
        await advanceTimersAndSettle(5000)

        expect(mockAppwriteDb.ensurePluginRun).toHaveBeenCalledTimes(2)
        expect(service.syncState()).toBe('idle')
    })

    it('should surface an error state once auto-retries are exhausted and recover on manual retry', async () => {
        setup(realUser)
        mockAppwriteDb.ensurePluginRun.mockRejectedValue(new Error('Still down'))
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        await service.commit({ op: 'upsert', correlation_uuid: 'uuid-1', payload: makeRun('uuid-1') })
        // Set the change to 7 failed attempts, so the next failure reaches the limit of 8
        const op = await runsDb.peekFirstOp()
        await runsDb.updateOp({ ...op!, attempts: 7 })
        await service.drainNow()

        expect(service.syncState()).toBe('error')
        expect(await runsDb.countOps()).toBe(1)

        mockAppwriteDb.ensurePluginRun.mockResolvedValue(undefined)
        service.retrySync()
        await advanceTimersAndSettle(600)

        expect(service.syncState()).toBe('idle')
        consoleWarn.mockRestore()
    })

    it('should not drain while offline and resume when back online', async () => {
        setup(realUser)
        window.dispatchEvent(new Event('offline'))

        await service.commit({ op: 'upsert', correlation_uuid: 'uuid-1', payload: makeRun('uuid-1') })
        await advanceTimersAndSettle(1000)

        expect(mockAppwriteDb.ensurePluginRun).not.toHaveBeenCalled()
        expect(service.syncState()).toBe('pending')

        window.dispatchEvent(new Event('online'))
        await advanceTimersAndSettle(1000)

        expect(mockAppwriteDb.ensurePluginRun).toHaveBeenCalledTimes(1)
        expect(service.syncState()).toBe('idle')
    })

    it('should share the in-flight drain with concurrent callers', async () => {
        setup(realUser)
        let resolveUpsert!: () => void
        const upsertStarted = new Promise<void>(started => {
            mockAppwriteDb.ensurePluginRun.mockImplementation(() => {
                started()
                return new Promise<void>(resolve => {
                    resolveUpsert = resolve
                })
            })
        })

        await service.commit({ op: 'upsert', correlation_uuid: 'uuid-1', payload: makeRun('uuid-1') })
        // E.g. the logout hook joining a drain that is already running
        const first = service.drainNow()
        const second = service.drainNow()
        expect(second).toBe(first)

        await upsertStarted
        resolveUpsert()
        await first

        expect(mockAppwriteDb.ensurePluginRun).toHaveBeenCalledTimes(1)
        expect(await runsDb.countOps()).toBe(0)
    })

    it('should leave the outbox untouched when another tab holds the drain lock', async () => {
        setup(realUser)
        const locksRequest = vi.spyOn(navigator.locks, 'request') as MockInstance
        locksRequest.mockImplementation(async (_name, _options, callback) =>
            (callback as (lock: null) => Promise<void>)(null)
        )

        await service.commit({ op: 'upsert', correlation_uuid: 'uuid-1', payload: makeRun('uuid-1') })
        await advanceTimersAndSettle(1000)

        expect(mockAppwriteDb.ensurePluginRun).not.toHaveBeenCalled()
        expect(await runsDb.countOps()).toBe(1)
        locksRequest.mockRestore()
    })
})
