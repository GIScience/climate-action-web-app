import { Injectable } from '@angular/core'
import { ComputationDatabaseEntity } from '@app/dashboard/computations-index/computation.interface'
import { IDBPDatabase, openDB } from 'idb'

export interface OutboxOp {
    id?: number
    op: 'upsert' | 'delete'
    correlation_uuid: string
    payload?: ComputationDatabaseEntity
    attempts: number
}

const DB_NAME = 'climate_action_local'
const DB_VERSION = 1
const RUNS_STORE = 'runs'
const OUTBOX_STORE = 'outbox'

// Local storage for computation runs, backed by IndexedDB.
// `runs` holds the runs themselves, so they survive a reload.
// `outbox` holds the changes that still have to be sent to Appwrite.
@Injectable({
    providedIn: 'root'
})
export class RunsDbService {
    private dbPromise: Promise<IDBPDatabase> = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            db.createObjectStore(RUNS_STORE, { keyPath: 'correlation_uuid' })
            // Auto-increment keys keep changes in the order they were added
            db.createObjectStore(OUTBOX_STORE, { autoIncrement: true })
        }
    })

    // Runs store

    async getAllRuns(): Promise<ComputationDatabaseEntity[]> {
        return (await this.dbPromise).getAll(RUNS_STORE)
    }

    // Persists runs locally, all in one transaction. Callers pass a single
    // run (a local edit) or a whole page fetched from the server (a merge).
    async putRuns(runs: ComputationDatabaseEntity[]): Promise<void> {
        if (runs.length === 0) return
        const tx = (await this.dbPromise).transaction(RUNS_STORE, 'readwrite')
        runs.forEach(run => tx.store.put(run))
        await tx.done
    }

    // Applies a change to the runs store and appends it to the outbox in one
    // transaction. Older changes for the same run are removed first
    // (except one that's in-flight), since only the latest one matters.
    async commitOp(op: Omit<OutboxOp, 'id'>, inFlightId?: number): Promise<number> {
        const tx = (await this.dbPromise).transaction([RUNS_STORE, OUTBOX_STORE], 'readwrite')
        if (op.op === 'upsert' && op.payload) {
            tx.objectStore(RUNS_STORE).put(op.payload)
        } else if (op.op === 'delete') {
            tx.objectStore(RUNS_STORE).delete(op.correlation_uuid)
        }
        const outbox = tx.objectStore(OUTBOX_STORE)
        let cursor = await outbox.openCursor()
        while (cursor) {
            const existing = cursor.value as OutboxOp
            if (existing.correlation_uuid === op.correlation_uuid && cursor.key !== inFlightId) {
                await cursor.delete()
            }
            cursor = await cursor.continue()
        }
        const key = await outbox.add(op)
        await tx.done
        return key as number
    }

    // Oldest change in the outbox, without removing it. The caller deletes it
    // explicitly once it has been delivered (see RunSyncService.processOutbox).
    async peekFirstOp(): Promise<(OutboxOp & { id: number }) | null> {
        const cursor = await (await this.dbPromise).transaction(OUTBOX_STORE).store.openCursor()
        return cursor ? { ...(cursor.value as OutboxOp), id: cursor.key as number } : null
    }

    async deleteOp(id: number): Promise<void> {
        await (await this.dbPromise).delete(OUTBOX_STORE, id)
    }

    async updateOp(op: OutboxOp): Promise<void> {
        if (op.id === undefined) return
        const { id, ...value } = op
        await (await this.dbPromise).put(OUTBOX_STORE, value, id)
    }

    async countOps(): Promise<number> {
        return (await this.dbPromise).count(OUTBOX_STORE)
    }

    async getPendingOpUuids(): Promise<{ upserts: Set<string>; deletes: Set<string> }> {
        const ops = (await (await this.dbPromise).getAll(OUTBOX_STORE)) as OutboxOp[]
        const pending = { upserts: new Set<string>(), deletes: new Set<string>() }
        for (const op of ops) {
            const uuids = op.op === 'upsert' ? pending.upserts : pending.deletes
            uuids.add(op.correlation_uuid)
        }
        return pending
    }

    // Wipes both stores, e.g. on logout

    async clearAll(): Promise<void> {
        const db = await this.dbPromise
        await Promise.all([db.clear(RUNS_STORE), db.clear(OUTBOX_STORE)])
    }
}
