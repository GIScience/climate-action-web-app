import { Injectable, inject } from '@angular/core'
import { AppwriteService } from '@app/auth/appwrite.service'
import { ComputationDatabaseEntity } from '@app/dashboard/computations-index/computation.interface'
import { environment } from '@environments/environment'
import { ID, Models, Permission, Query, Role, TablesDB } from 'appwrite'

// Map request_ts to timestamp to maintain Appwrite compatibility
export interface ComputationRow extends Models.Row, Omit<ComputationDatabaseEntity, 'request_ts'> {
    user_id: string
    timestamp: ComputationDatabaseEntity['request_ts']
}

export interface PaginationParams {
    limit: number
    cursor?: string
    pluginId: string
}

export interface PaginatedResult<T> {
    documents: T[]
    hasMore: boolean
    nextCursor?: string
}

@Injectable({
    providedIn: 'root'
})

// Appwrite side of the runs storage: the user's rows in the runs table.
export class AppwriteDbService {
    private appwriteService = inject(AppwriteService)

    private readonly DATABASE_ID = 'climate_action'
    private readonly RUNS_TABLE_ID = environment.appwriteRunsCollectionId
    // @ts-ignore: Suppress TypeScript error for test environment detection
    private isTestEnvironment = typeof jest !== 'undefined' || typeof Cypress !== 'undefined'

    private get tablesDB(): TablesDB {
        return this.appwriteService.getTablesDB()
    }

    private get user_id(): string | null {
        return this.appwriteService._user.value?.$id || null
    }

    private logError(message: string, error: Error | unknown): void {
        if (!this.isTestEnvironment) {
            console.error(message, error)
        }
    }

    async fetchPluginRunsPaginated(params: PaginationParams): Promise<PaginatedResult<ComputationDatabaseEntity>> {
        try {
            if (!this.user_id) {
                return { documents: [], hasMore: false }
            }

            const queries = [
                Query.equal('user_id', this.user_id),
                Query.equal('pluginId', params.pluginId),
                Query.limit(params.limit),
                Query.orderDesc('timestamp')
            ]

            if (params.cursor) {
                queries.push(Query.cursorAfter(params.cursor))
            }

            const response = await this.tablesDB.listRows<ComputationRow>({
                databaseId: this.DATABASE_ID,
                tableId: this.RUNS_TABLE_ID,
                queries
            })

            const documents = response.rows.map(
                row =>
                    ({
                        correlation_uuid: row.correlation_uuid,
                        flags: row.flags,
                        pluginId: row.pluginId,
                        request_ts: row.timestamp,
                        status: row.status,
                        aoiName: row.aoiName,
                        language: row.language
                    }) as ComputationDatabaseEntity
            )

            const hasMore = documents.length === params.limit
            const nextCursor =
                hasMore && response.rows.length > 0 ? response.rows[response.rows.length - 1].$id : undefined

            return {
                documents,
                hasMore,
                nextCursor
            }
        } catch (error) {
            this.logError('Error fetching paginated plugin runs from Appwrite:', error)
            return { documents: [], hasMore: false }
        }
    }

    private async findRunRowId(correlationId: string, userId: string): Promise<string | null> {
        const response = await this.tablesDB.listRows({
            databaseId: this.DATABASE_ID,
            tableId: this.RUNS_TABLE_ID,
            queries: [Query.equal('correlation_uuid', correlationId), Query.equal('user_id', userId), Query.limit(1)]
        })

        return response.rows.length > 0 ? response.rows[0].$id : null
    }

    // Creates the run's row, or updates it if it already exists, so it
    // is safe to repeat. Used by the outbox drain. Unlike the paginated fetch,
    // this throws on failure so the outbox retries.
    async ensurePluginRun(run: ComputationDatabaseEntity): Promise<void> {
        if (!this.user_id) throw new Error('Cannot sync plugin run without a logged-in user')

        const { request_ts, ...rest } = run
        const data = { ...rest, timestamp: request_ts }
        const rowId = await this.findRunRowId(run.correlation_uuid, this.user_id)

        if (rowId) {
            await this.tablesDB.updateRow({ databaseId: this.DATABASE_ID, tableId: this.RUNS_TABLE_ID, rowId, data })
            return
        }

        const role = Role.user(this.user_id)
        await this.tablesDB.createRow({
            databaseId: this.DATABASE_ID,
            tableId: this.RUNS_TABLE_ID,
            rowId: ID.unique(),
            data: { ...data, user_id: this.user_id },
            permissions: [Permission.read(role), Permission.update(role), Permission.delete(role)]
        })
    }

    // Deletes the run's row. Used by the outbox drain.
    // A missing row counts as success (already deleted, or never
    // uploaded). Throws on failure so the outbox retries.
    async removePluginRun(correlationId: string): Promise<void> {
        if (!this.user_id) throw new Error('Cannot delete plugin run without a logged-in user')

        const rowId = await this.findRunRowId(correlationId, this.user_id)
        if (!rowId) return

        await this.tablesDB.deleteRow({ databaseId: this.DATABASE_ID, tableId: this.RUNS_TABLE_ID, rowId })
    }

    async getTotalComputationsCount(): Promise<number> {
        try {
            if (!this.user_id) return 0

            // We only need the total count, not the rows
            const response = await this.tablesDB.listRows({
                databaseId: this.DATABASE_ID,
                tableId: this.RUNS_TABLE_ID,
                queries: [Query.equal('user_id', this.user_id), Query.limit(1)]
            })

            return response.total
        } catch (error) {
            this.logError('Error fetching total computations count:', error)
            return 0
        }
    }

    async getLatestComputation(): Promise<ComputationDatabaseEntity | null> {
        try {
            if (!this.user_id) return null

            const response = await this.tablesDB.listRows<ComputationRow>({
                databaseId: this.DATABASE_ID,
                tableId: this.RUNS_TABLE_ID,
                queries: [Query.equal('user_id', this.user_id), Query.orderDesc('timestamp'), Query.limit(1)]
            })

            if (response.rows.length === 0) return null

            const row = response.rows[0]
            return {
                correlation_uuid: row.correlation_uuid,
                flags: row.flags,
                pluginId: row.pluginId,
                request_ts: row.timestamp,
                status: row.status,
                aoiName: row.aoiName,
                language: row.language
            } as ComputationDatabaseEntity
        } catch (error) {
            this.logError('Error fetching latest computation:', error)
            return null
        }
    }
}
