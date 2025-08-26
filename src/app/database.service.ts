import { Injectable } from '@angular/core'
import { Databases, ID, Models, Permission, Query, Role } from 'appwrite'
import { AppwriteService } from './auth/appwrite.service'
import { ComputationItemState } from './dashboard/common/status.types'
import { ComputationDatabaseEntity } from './dashboard/computations-index/computation.interface'

export interface BasicKeyInfo extends Models.Document {
    hash: string
    tyk_user_id: string
    ors_policy: string
    policy_upgrade_requests: string[]
    key: string
}

export interface PaginationParams {
    limit: number
    cursor?: string
    pluginId: string
    state?: ComputationItemState
}

export interface PaginatedResult<T> {
    documents: T[]
    total: number
    hasMore: boolean
    nextCursor?: string
}

@Injectable({
    providedIn: 'root'
})
export class DatabaseService {
    private readonly DATABASE_ID = 'climate_action'
    private readonly RUNS_COLLECTION_ID = 'dashboard_data'
    // @ts-ignore: Suppress TypeScript error for test environment detection
    private isTestEnvironment = typeof jest !== 'undefined' || typeof Cypress !== 'undefined'

    constructor(private appwriteService: AppwriteService) {}

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
                return { documents: [], total: 0, hasMore: false }
            }

            const queries = [
                Query.equal('user_id', this.user_id),
                Query.equal('pluginId', params.pluginId),
                Query.limit(params.limit),
                Query.orderDesc('timestamp')
            ]

            const stateFilter = params.state || 'ACTIVE'
            queries.push(Query.equal('state', stateFilter))

            if (params.cursor) {
                queries.push(Query.cursorAfter(params.cursor))
            }

            const response = await this.databases.listDocuments(this.DATABASE_ID, this.RUNS_COLLECTION_ID, queries)

            const documents = response.documents.map(
                (doc: Models.Document) =>
                    ({
                        correlation_uuid: doc['correlation_uuid'],
                        flags: doc['flags'],
                        state: doc['state'],
                        pluginId: doc['pluginId'],
                        timestamp: doc['timestamp'],
                        status: doc['status'],
                        aoiName: doc['aoiName']
                    }) as ComputationDatabaseEntity
            )

            const hasMore = documents.length === params.limit
            const nextCursor =
                hasMore && response.documents.length > 0
                    ? response.documents[response.documents.length - 1].$id
                    : undefined

            return {
                documents,
                total: response.total,
                hasMore,
                nextCursor
            }
        } catch (error) {
            this.logError('Error fetching paginated plugin runs from Appwrite:', error)
            return { documents: [], total: 0, hasMore: false }
        }
    }

    async createPluginRun(run: ComputationDatabaseEntity): Promise<string | null> {
        try {
            if (!this.user_id) return null

            const permissions = [Permission.read(Role.user(this.user_id)), Permission.update(Role.user(this.user_id))]

            const response = await this.databases.createDocument(
                this.DATABASE_ID,
                this.RUNS_COLLECTION_ID,
                ID.unique(),
                {
                    ...run,
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

    getBasicKey(): Promise<BasicKeyInfo | null> {
        if (!this.user_id) return Promise.resolve(null)
        return this.databases.getDocument('tyk_integration', 'basic_keys', this.user_id) as Promise<BasicKeyInfo>
    }

    async hasDemoComputations(pluginId: string): Promise<boolean> {
        try {
            if (!this.user_id) return false

            const response = await this.databases.listDocuments(this.DATABASE_ID, this.RUNS_COLLECTION_ID, [
                Query.equal('user_id', this.user_id),
                Query.equal('pluginId', pluginId),
                Query.contains('flags', 'DEMO'),
                Query.limit(1)
            ])

            return response.documents.length > 0
        } catch (error) {
            this.logError('Error checking for demo computations:', error)
            return false
        }
    }

    // TODO: Temporary migration script, remove after all users run states have been migrated
    async migrateComputationsToStateField(): Promise<void> {
        try {
            if (!this.user_id) {
                console.log('No user logged in, skipping migration')
                return
            }

            console.log('Starting migration of computations to state field...')

            const allDocuments = await this.databases.listDocuments(this.DATABASE_ID, this.RUNS_COLLECTION_ID, [
                Query.equal('user_id', this.user_id),
                Query.limit(1000)
            ])

            console.log(`Found ${allDocuments.documents.length} documents to migrate`)

            let migratedCount = 0
            let archivedCount = 0
            let activeCount = 0

            for (const doc of allDocuments.documents) {
                const flags = (doc['flags'] as string[]) || []
                const hasArchivedFlag = flags.includes('ARCHIVED')

                const newState: ComputationItemState = hasArchivedFlag ? 'ARCHIVED' : 'ACTIVE'

                if (!doc['state'] || doc['state'] !== newState) {
                    const cleanedFlags = flags.filter(flag => flag !== 'ARCHIVED')

                    await this.databases.updateDocument(this.DATABASE_ID, this.RUNS_COLLECTION_ID, doc.$id, {
                        state: newState,
                        flags: cleanedFlags
                    })

                    migratedCount++
                    if (newState === 'ARCHIVED') {
                        archivedCount++
                    } else {
                        activeCount++
                    }
                }
            }

            console.log(`Migration complete: ${migratedCount} documents updated`)
            console.log(`- Set to ACTIVE: ${activeCount}`)
            console.log(`- Set to ARCHIVED: ${archivedCount}`)
        } catch (error) {
            this.logError('Error during migration:', error)
            throw error
        }
    }
}
