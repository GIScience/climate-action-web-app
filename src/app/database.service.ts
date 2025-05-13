import { Injectable } from '@angular/core'
import { Databases, ID, Models, Permission, Query, Role } from 'appwrite'
import { AppwriteService } from './auth/appwrite.service'
import { ComputationDatabaseEntity } from './dashboard/computations-index/computation.interface'

export interface BasicKeyInfo extends Models.Document {
    hash: string
    tyk_user_id: string
    ors_policy: string
    policy_upgrade_requests: string[]
    key: string
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

    private get userId(): string | null {
        return this.appwriteService._user.value?.$id || null
    }

    private logError(message: string, error: Error | unknown): void {
        if (!this.isTestEnvironment) {
            console.error(message, error)
        }
    }

    async getPluginRuns(): Promise<ComputationDatabaseEntity[]> {
        try {
            if (!this.userId) return []

            const response = await this.databases.listDocuments(this.DATABASE_ID, this.RUNS_COLLECTION_ID, [
                Query.equal('userId', this.userId),
                Query.limit(1000)
            ])

            return response.documents.map(
                doc =>
                    ({
                        correlation_uuid: doc['correlation_uuid'],
                        flag: doc['flag'],
                        pluginId: doc['pluginId'],
                        timestamp: doc['timestamp'],
                        status: doc['status'],
                        aoiName: doc['aoiName']
                    }) as ComputationDatabaseEntity
            )
        } catch (error) {
            this.logError('Error fetching plugin runs from Appwrite:', error)
            return []
        }
    }

    async createPluginRun(run: ComputationDatabaseEntity): Promise<string | null> {
        try {
            if (!this.userId) return null

            const permissions = [Permission.read(Role.user(this.userId)), Permission.update(Role.user(this.userId))]

            const response = await this.databases.createDocument(
                this.DATABASE_ID,
                this.RUNS_COLLECTION_ID,
                ID.unique(),
                {
                    ...run,
                    userId: this.userId
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
            if (!this.userId) return false

            const response = await this.databases.listDocuments(this.DATABASE_ID, this.RUNS_COLLECTION_ID, [
                Query.equal('correlation_uuid', correlationId),
                Query.equal('userId', this.userId),
                Query.limit(1000)
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

    async syncPluginRuns(runs: ComputationDatabaseEntity[]): Promise<boolean> {
        try {
            if (!this.userId) return false

            const existingRuns = await this.getPluginRuns()
            const existingIds = new Set(existingRuns.map(run => run.correlation_uuid))

            for (const run of runs) {
                if (existingIds.has(run.correlation_uuid)) {
                    await this.updatePluginRun(run.correlation_uuid, run)
                } else {
                    await this.createPluginRun(run)
                }
            }

            return true
        } catch (error) {
            this.logError('Error syncing plugin runs with Appwrite:', error)
            return false
        }
    }

    getBasicKey(): Promise<BasicKeyInfo | null> {
        if (!this.userId) return Promise.resolve(null)
        return this.databases.getDocument('tyk_integration', 'basic_keys', this.userId) as Promise<BasicKeyInfo>
    }
}
