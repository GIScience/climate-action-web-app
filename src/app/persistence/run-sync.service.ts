import { computed, inject, Injectable, signal } from '@angular/core'
import { AppwriteService } from '@app/auth/appwrite.service'
import { isRealUser } from '@app/auth/user.utils'
import { Models } from 'appwrite'
import { AppwriteDbService } from './appwrite-db.service'
import { OutboxOp, RunsDbService } from './runs-db.service'

export type SyncState = 'idle' | 'pending' | 'syncing' | 'error'

const DRAIN_DEBOUNCE_MS = 500
const BASE_RETRY_DELAY_MS = 5_000
const MAX_RETRY_DELAY_MS = 300_000
// After this many failures a change is no longer retried automatically. It
// stays in the outbox and is tried again on login, on reconnect, when a new
// change is queued, or on a manual retry.
const MAX_AUTO_ATTEMPTS = 8
const DRAIN_LOCK = 'run-outbox-drain'

// Sends the changes waiting in the outbox to Appwrite ("draining"): one at a
// time, oldest first, so changes to a run arrive in the order they were made.
// A failed change is retried with increasing delays. While no real user is
// logged in, changes just pile up. They are uploaded once a real user logs in.
@Injectable({
    providedIn: 'root'
})
export class RunSyncService {
    private appwriteService = inject(AppwriteService)
    private appwriteDb = inject(AppwriteDbService)
    private runsDb = inject(RunsDbService)

    private readonly _hasPending = signal(false)
    private readonly _online = signal(navigator.onLine)
    private readonly _draining = signal(false)
    private readonly _syncError = signal(false)
    private readonly currentUser = signal<Models.User<Models.Preferences> | null>(null)
    // Anonymous visitors and the fake dev user have no account to sync into
    private readonly realOnlineUser = computed(() => isRealUser(this.currentUser()))

    readonly syncState = computed<SyncState>(() => {
        if (!this.realOnlineUser() || !this._online()) return this._hasPending() ? 'pending' : 'idle'
        if (this._draining()) return 'syncing'
        if (this._syncError()) return 'error'
        return this._hasPending() ? 'pending' : 'idle'
    })

    private drainTimer: ReturnType<typeof setTimeout> | null = null
    private inFlightOpId: number | null = null
    private drainPromise: Promise<void> | null = null

    constructor() {
        this.appwriteService._user.subscribe(user => {
            this.currentUser.set(user)
            if (this.realOnlineUser()) {
                // Upload whatever is still waiting in the outbox
                this.scheduleDrain()
            }
        })

        window.addEventListener('online', () => {
            this._online.set(true)
            this.scheduleDrain()
        })
        window.addEventListener('offline', () => this._online.set(false))

        this.refreshPending().catch(error => console.error('Could not read pending sync ops:', error))
    }

    // Persists the change locally and queues it for upload, as one atomic commit.
    async commit(op: Pick<OutboxOp, 'op' | 'correlation_uuid' | 'payload'>): Promise<void> {
        await this.runsDb.commitOp({ ...op, attempts: 0 }, this.inFlightOpId ?? undefined)
        await this.refreshPending()
        this.scheduleDrain()
    }

    // Schedules a drain after `delayMs`. Only one drain is scheduled at a time:
    // a new request replaces the previous one, including a waiting retry.
    scheduleDrain(delayMs: number = DRAIN_DEBOUNCE_MS): void {
        if (this.drainTimer) {
            clearTimeout(this.drainTimer)
        }
        this.drainTimer = setTimeout(() => {
            this.drainTimer = null
            this.drainNow().catch(error => console.error('Sync drain failed:', error))
        }, delayMs)
    }

    // Manual retry from the sync badge, once automatic retries have stopped.
    retrySync(): void {
        this._syncError.set(false)
        this.scheduleDrain()
    }

    // Drains right away. If a drain is already running, callers get that same
    // promise, so the logout hook waits for it to finish.
    drainNow(): Promise<void> {
        if (!this.drainPromise) {
            this.drainPromise = this.runDrain().finally(() => {
                this.drainPromise = null
            })
        }
        return this.drainPromise
    }

    private async runDrain(): Promise<void> {
        if (!this._online() || !this.realOnlineUser()) return

        this._draining.set(true)
        try {
            // Only one tab may drain at a time, otherwise two tabs could send the
            // same change and create duplicate documents. If another tab holds the
            // lock, this drain is skipped.
            await navigator.locks.request(DRAIN_LOCK, { ifAvailable: true }, async lock => {
                if (lock) {
                    await this.processOutbox()
                }
            })
        } finally {
            this._draining.set(false)
            await this.refreshPending()
        }
    }

    // Sends the oldest change, then the next, until the outbox is empty.
    // Stops at the first failure, so later changes never overtake a failed one.
    private async processOutbox(): Promise<void> {
        let op = await this.runsDb.peekFirstOp()
        while (op) {
            this.inFlightOpId = op.id
            try {
                if (op.op === 'upsert' && op.payload) {
                    await this.appwriteDb.ensurePluginRun(op.payload)
                } else if (op.op === 'delete') {
                    await this.appwriteDb.removePluginRun(op.correlation_uuid)
                }
                await this.runsDb.deleteOp(op.id)
                this._syncError.set(false)
                await this.refreshPending()
            } catch (error) {
                const attempts = op.attempts + 1
                await this.runsDb.updateOp({ ...op, attempts })
                if (attempts >= MAX_AUTO_ATTEMPTS) {
                    console.warn('Sync retries exhausted, op retained for manual retry:', op, error)
                    this._syncError.set(true)
                } else {
                    this.scheduleDrain(Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempts - 1), MAX_RETRY_DELAY_MS))
                }
                return
            } finally {
                this.inFlightOpId = null
            }
            op = await this.runsDb.peekFirstOp()
        }
    }

    private async refreshPending(): Promise<void> {
        this._hasPending.set((await this.runsDb.countOps()) > 0)
    }
}
