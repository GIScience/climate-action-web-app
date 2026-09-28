import { Injectable, inject } from '@angular/core'
import { Databases, ID, Models, Permission, Query, Role } from 'appwrite'
import { environment } from '../environments/environment'
import { AppwriteService } from './auth/appwrite.service'
import { ComputationDatabaseEntity } from './dashboard/computations-index/computation.interface'

export interface BasicKeyInfo extends Models.Document {
    hash: string
    tyk_user_id: string
    ors_policy: string
    policy_upgrade_requests: string[]
    key: string
}

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
export class DatabaseService {
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

    async createPluginRun(run: ComputationDatabaseEntity): Promise<string | null> {
        try {
            if (!this.user_id) return null

            const permissions = [
                Permission.read(Role.user(this.user_id)),
                Permission.update(Role.user(this.user_id)),
                Permission.delete(Role.user(this.user_id))
            ]

            const { request_ts, ...rest } = run
            const response = await this.databases.createDocument(
                this.DATABASE_ID,
                this.RUNS_COLLECTION_ID,
                ID.unique(),
                {
                    ...rest,
                    timestamp: request_ts,
                    user_id: this.user_id
                },
                permissions
            )

            return response.$id
        } catch (error) {
            this.logError('Error creating plugin run in Appwrite:', error)
            return null
        }
    }

    async updatePluginRun(correlationId: string, updates: Partial<ComputationDatabaseEntity>): Promise<boolean> {
        try {
            if (!this.user_id) return false

            const response = await this.databases.listDocuments(this.DATABASE_ID, this.RUNS_COLLECTION_ID, [
                Query.equal('correlation_uuid', correlationId),
                Query.equal('user_id', this.user_id),
                Query.limit(1)
            ])

            if (response.documents.length === 0) return false

            await this.databases.updateDocument(
                this.DATABASE_ID,
                this.RUNS_COLLECTION_ID,
                response.documents[0].$id,
                updates
            )

            return true
        } catch (error) {
            this.logError('Error updating plugin run in Appwrite:', error)
            return false
        }
    }

    async deletePluginRun(correlationId: string): Promise<boolean> {
        try {
            if (!this.user_id) return false

            const response = await this.databases.listDocuments(this.DATABASE_ID, this.RUNS_COLLECTION_ID, [
                Query.equal('correlation_uuid', correlationId),
                Query.equal('user_id', this.user_id),
                Query.limit(1)
            ])

            if (response.documents.length === 0) return false

            await this.databases.deleteDocument(this.DATABASE_ID, this.RUNS_COLLECTION_ID, response.documents[0].$id)

            return true
        } catch (error) {
            this.logError('Error deleting plugin run in Appwrite:', error)
            return false
        }
    }

    getBasicKey(): Promise<BasicKeyInfo | null> {
        if (!this.user_id) return Promise.resolve(null)
        return this.databases.getDocument('tyk_integration', 'basic_keys', this.user_id) as Promise<BasicKeyInfo>
    }

    async getTotalActiveComputationsCount(): Promise<number> {
        try {
            if (!this.user_id) return 0

            const response = await this.databases.listDocuments(this.DATABASE_ID, this.RUNS_COLLECTION_ID, [
                Query.equal('user_id', this.user_id),
                Query.limit(1) // We only need the total count, not the documents
            ])

            return response.total
        } catch (error) {
            this.logError('Error fetching total active computations count:', error)
            return 0
        }
    }

    async getLatestActiveComputation(): Promise<ComputationDatabaseEntity | null> {
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
            this.logError('Error fetching latest active computation:', error)
            return null
        }
    }
}
