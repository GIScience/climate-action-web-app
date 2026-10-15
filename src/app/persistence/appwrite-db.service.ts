import { Injectable, inject } from '@angular/core'
import { AppwriteService } from '@app/auth/appwrite.service'
import { ComputationDatabaseEntity } from '@app/dashboard/computations-index/computation.interface'
import { environment } from '@environments/environment'
import { Databases, ID, Models, Permission, Query, Role } from 'appwrite'

// Map request_ts to timestamp to maintain Appwrite compatibility
export interface ComputationDocument extends Models.Document, Omit<ComputationDatabaseEntity, 'request_ts'> {
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

// Appwrite side of the runs storage: the user's documents in the runs collection.
export class AppwriteDbService {
    private appwriteService = inject(AppwriteService)

    private readonly DATABASE_ID = 'climate_action'
    private readonly RUNS_COLLECTION_ID = environment.appwriteRunsCollectionId
    // @ts-ignore: Suppress TypeScript error for test environment detection
    private isTestEnvironment = typeof jest !== 'undefined' || typeof Cypress !== 'undefined'

    private get databases(): Databases {
        return this.appwriteService.getDatabases()
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

            const response = await this.databases.listDocuments<ComputationDocument>(
                this.DATABASE_ID,
                this.RUNS_COLLECTION_ID,
                queries
            )

            const documents = response.documents.map(
                doc =>
                    ({
                        correlation_uuid: doc.correlation_uuid,
                        flags: doc.flags,
                        pluginId: doc.pluginId,
                        request_ts: doc.timestamp,
                        status: doc.status,
                        aoiName: doc.aoiName,
                        language: doc.language
                    }) as ComputationDatabaseEntity
            )

            const hasMore = documents.length === params.limit
            const nextCursor =
                hasMore && response.documents.length > 0
                    ? response.documents[response.documents.length - 1].$id
                    : undefined

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

    private async findRunDocumentId(correlationId: string, userId: string): Promise<string | null> {
        const response = await this.databases.listDocuments(this.DATABASE_ID, this.RUNS_COLLECTION_ID, [
            Query.equal('correlation_uuid', correlationId),
            Query.equal('user_id', userId),
            Query.limit(1)
        ])

        return response.documents.length > 0 ? response.documents[0].$id : null
    }

    // Creates the run's document, or updates it if it already exists, so it
    // is safe to repeat. Used by the outbox drain. Unlike the paginated fetch,
    // this throws on failure so the outbox retries.
    async ensurePluginRun(run: ComputationDatabaseEntity): Promise<void> {
        if (!this.user_id) throw new Error('Cannot sync plugin run without a logged-in user')

        const { request_ts, ...rest } = run
        const data = { ...rest, timestamp: request_ts }
        const documentId = await this.findRunDocumentId(run.correlation_uuid, this.user_id)

        if (documentId) {
            await this.databases.updateDocument(this.DATABASE_ID, this.RUNS_COLLECTION_ID, documentId, data)
            return
        }

        const role = Role.user(this.user_id)
        await this.databases.createDocument(
            this.DATABASE_ID,
            this.RUNS_COLLECTION_ID,
            ID.unique(),
            { ...data, user_id: this.user_id },
            [Permission.read(role), Permission.update(role), Permission.delete(role)]
        )
    }

    // Deletes the run's document. Used by the outbox drain.
    // A missing document counts as success (already deleted, or never
    // uploaded). Throws on failure so the outbox retries.
    async removePluginRun(correlationId: string): Promise<void> {
        if (!this.user_id) throw new Error('Cannot delete plugin run without a logged-in user')

        const documentId = await this.findRunDocumentId(correlationId, this.user_id)
        if (!documentId) return

        await this.databases.deleteDocument(this.DATABASE_ID, this.RUNS_COLLECTION_ID, documentId)
    }

    async getTotalComputationsCount(): Promise<number> {
        try {
            if (!this.user_id) return 0

            const response = await this.databases.listDocuments(this.DATABASE_ID, this.RUNS_COLLECTION_ID, [
                Query.equal('user_id', this.user_id),
                Query.limit(1) // We only need the total count, not the documents
            ])

            return response.total
        } catch (error) {
            this.logError('Error fetching total computations count:', error)
            return 0
        }
    }

    async getLatestComputation(): Promise<ComputationDatabaseEntity | null> {
        try {
            if (!this.user_id) return null

            const response = await this.databases.listDocuments<ComputationDocument>(
                this.DATABASE_ID,
                this.RUNS_COLLECTION_ID,
                [Query.equal('user_id', this.user_id), Query.orderDesc('timestamp'), Query.limit(1)]
            )

            if (response.documents.length === 0) return null

            const doc = response.documents[0]
            return {
                correlation_uuid: doc.correlation_uuid,
                flags: doc.flags,
                pluginId: doc.pluginId,
                request_ts: doc.timestamp,
                status: doc.status,
                aoiName: doc.aoiName,
                language: doc.language
            } as ComputationDatabaseEntity
        } catch (error) {
            this.logError('Error fetching latest computation:', error)
            return null
        }
    }
}
