import { discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { PluginService } from '../plugin/plugin.service'
import { ComputationSyncService, RunStateTransition } from './computation-sync.service'
import { ComputationDatabaseEntity } from './computation.interface'

const POLL_INTERVAL = 5000
const MAX_INTERVAL = 1800000

describe('ComputationSyncService', () => {
    let service: ComputationSyncService
    let mockPluginService: { getComputationRunState: jest.Mock }
    let transitions: RunStateTransition[]

    const createRun = (overrides: Partial<ComputationDatabaseEntity> = {}): ComputationDatabaseEntity => ({
        correlation_uuid: 'run-1',
        request_ts: new Date(Date.now()),
        status: 'PENDING',
        aoiName: 'Test AOI',
        pluginId: 'test_plugin',
        ...overrides
    })

    beforeEach(() => {
        mockPluginService = {
            getComputationRunState: jest.fn().mockReturnValue(of({ state: 'PENDING' }))
        }

        TestBed.configureTestingModule({
            providers: [ComputationSyncService, { provide: PluginService, useValue: mockPluginService }]
        })

        service = TestBed.inject(ComputationSyncService)
        transitions = []
        service.transitions$.subscribe(transition => transitions.push(transition))
    })

    afterEach(() => {
        service.stop()
    })

    it('should emit a transition per non-pending state and carry the failure message', fakeAsync(() => {
        const runs = [
            createRun({ correlation_uuid: 'started-run' }),
            createRun({ correlation_uuid: 'success-run' }),
            createRun({ correlation_uuid: 'failed-run' }),
            createRun({ correlation_uuid: 'pending-run' })
        ]
        const stateByUuid: Record<string, { state: string; message?: string }> = {
            'started-run': { state: 'STARTED' },
            'success-run': { state: 'SUCCESS' },
            'failed-run': { state: 'FAILURE', message: 'out of memory' },
            'pending-run': { state: 'PENDING' }
        }
        mockPluginService.getComputationRunState = jest.fn((uuid: string) => of(stateByUuid[uuid]))

        service.start(() => runs)

        expect(transitions).toEqual([
            { run: runs[0], newStatus: 'STARTED' },
            { run: runs[1], newStatus: 'SUCCESS' },
            { run: runs[2], newStatus: 'FAILURE', message: 'out of memory' }
        ])

        service.stop()
        discardPeriodicTasks()
    }))

    it('should keep polling on the interval while runs stay pending', fakeAsync(() => {
        const runs = [createRun()]

        service.start(() => runs)
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(1)

        tick(POLL_INTERVAL)
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(2)

        tick(POLL_INTERVAL)
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(3)

        service.stop()
        discardPeriodicTasks()
    }))

    it('should not restart the polling loop when start is called while already active', fakeAsync(() => {
        const runs = [createRun()]

        service.start(() => runs)
        service.start(() => runs)
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(1)

        service.stop()
        discardPeriodicTasks()
    }))

    it('should stop polling once no pending runs remain', fakeAsync(() => {
        const runs = [createRun()]

        service.start(() => runs)
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(1)

        runs.length = 0
        tick(POLL_INTERVAL)
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(1)

        tick(POLL_INTERVAL)
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(1)
    }))

    it('should sync once without rescheduling when every pending run exceeded the max interval', fakeAsync(() => {
        const staleRun = createRun({ request_ts: new Date(Date.now() - MAX_INTERVAL) })

        service.start(() => [staleRun])
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(1)

        tick(POLL_INTERVAL)
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(1)
    }))

    it('should resume polling when the tab becomes visible with pending runs', fakeAsync(() => {
        const runs: ComputationDatabaseEntity[] = []

        service.start(() => runs)
        expect(mockPluginService.getComputationRunState).not.toHaveBeenCalled()

        runs.push(createRun())
        document.dispatchEvent(new Event('visibilitychange'))
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(1)

        service.stop()
        discardPeriodicTasks()
    }))

    it('should not resume on visibilitychange while the document is hidden', fakeAsync(() => {
        const runs: ComputationDatabaseEntity[] = []

        service.start(() => runs)
        runs.push(createRun())

        Object.defineProperty(document, 'hidden', { configurable: true, value: true })
        try {
            document.dispatchEvent(new Event('visibilitychange'))
            expect(mockPluginService.getComputationRunState).not.toHaveBeenCalled()
        } finally {
            delete (document as { hidden?: boolean }).hidden
        }
    }))

    it('should ignore scheduled polls and visibility changes after stop', fakeAsync(() => {
        const runs = [createRun()]

        service.start(() => runs)
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(1)

        service.stop()
        tick(POLL_INTERVAL)
        document.dispatchEvent(new Event('visibilitychange'))
        expect(mockPluginService.getComputationRunState).toHaveBeenCalledTimes(1)
    }))

    it('should log and emit nothing when the state check errors', fakeAsync(() => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        mockPluginService.getComputationRunState = jest.fn().mockReturnValue(throwError(() => new Error('boom')))
        const run = createRun()

        service.start(() => [run])

        expect(transitions).toEqual([])
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error checking state for run:',
            run.correlation_uuid,
            expect.any(Error)
        )

        consoleErrorSpy.mockRestore()
        service.stop()
        discardPeriodicTasks()
    }))

    it('should stop and complete the transitions stream on destroy', () => {
        let completed = false
        service.transitions$.subscribe({ complete: () => (completed = true) })

        service.ngOnDestroy()

        expect(completed).toBe(true)
    })
})
