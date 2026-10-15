import { ComputationDatabaseEntity } from '@app/dashboard/computations-index/computation.interface'
import { IDBFactory } from 'fake-indexeddb'
import { OutboxOp, RunsDbService } from './runs-db.service'

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

function makeOp(uuid: string, overrides: Partial<OutboxOp> = {}): Omit<OutboxOp, 'id'> {
    return {
        op: 'upsert',
        correlation_uuid: uuid,
        payload: makeRun(uuid),
        attempts: 0,
        ...overrides
    }
}

describe('RunsDbService', () => {
    let service: RunsDbService

    beforeEach(() => {
        // Fresh IndexedDB per test, so nothing leaks between tests
        globalThis.indexedDB = new IDBFactory()
        service = new RunsDbService()
    })

    it('should key runs by correlation_uuid', async () => {
        await service.putRuns([makeRun('uuid-1', { status: 'PENDING' }), makeRun('uuid-2')])
        await service.putRuns([makeRun('uuid-1', { status: 'SUCCESS' })])

        const runs = await service.getAllRuns()
        expect(runs.map(run => run.correlation_uuid).sort()).toEqual(['uuid-1', 'uuid-2'])
        expect(runs.find(run => run.correlation_uuid === 'uuid-1')?.status).toBe('SUCCESS')
    })

    describe('outbox', () => {
        it('should apply the run change in the same commit as the outbox entry', async () => {
            await service.commitOp(makeOp('uuid-1'))
            expect((await service.getAllRuns()).map(run => run.correlation_uuid)).toEqual(['uuid-1'])

            await service.commitOp(makeOp('uuid-1', { op: 'delete', payload: undefined }))
            expect(await service.getAllRuns()).toEqual([])
        })

        it('should enqueue ops and peek them in FIFO order', async () => {
            await service.commitOp(makeOp('uuid-1'))
            await service.commitOp(makeOp('uuid-2'))

            const first = await service.peekFirstOp()
            expect(first?.correlation_uuid).toBe('uuid-1')
            expect(first?.id).toBeDefined()
            expect(await service.countOps()).toBe(2)
        })

        it('should coalesce a pending upsert when a newer upsert for the same run arrives', async () => {
            await service.commitOp(makeOp('uuid-1', { payload: makeRun('uuid-1', { status: 'PENDING' }) }))
            await service.commitOp(makeOp('uuid-1', { payload: makeRun('uuid-1', { status: 'SUCCESS' }) }))

            expect(await service.countOps()).toBe(1)
            expect((await service.peekFirstOp())?.payload?.status).toBe('SUCCESS')
        })

        it('should cancel a pending upsert when a delete for the same run arrives', async () => {
            await service.commitOp(makeOp('uuid-1'))
            await service.commitOp(makeOp('uuid-1', { op: 'delete', payload: undefined }))

            expect(await service.countOps()).toBe(1)
            expect((await service.peekFirstOp())?.op).toBe('delete')
        })

        it('should not coalesce ops of other runs', async () => {
            await service.commitOp(makeOp('uuid-1'))
            await service.commitOp(makeOp('uuid-2'))
            await service.commitOp(makeOp('uuid-1'))

            expect(await service.countOps()).toBe(2)
            // uuid-1 was added again and moved to the end, so uuid-2 is now first
            expect((await service.peekFirstOp())?.correlation_uuid).toBe('uuid-2')
        })

        it('should leave the in-flight op alone when inFlightId is passed', async () => {
            const inFlightId = await service.commitOp(makeOp('uuid-1'))

            await service.commitOp(makeOp('uuid-1'), inFlightId)

            expect(await service.countOps()).toBe(2)
            expect((await service.peekFirstOp())?.id).toBe(inFlightId)
        })
    })
})
