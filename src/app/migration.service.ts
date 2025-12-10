import { Injectable, inject } from '@angular/core'
import { filter, take } from 'rxjs'
import { AppwriteService } from './auth/appwrite.service'
import { DatabaseService } from './database.service'

@Injectable({
    providedIn: 'root'
})
export class MigrationService {
    private databaseService = inject(DatabaseService)
    private appwriteService = inject(AppwriteService)

    private readonly MIGRATION_KEY = 'computation_state_migration_completed'

    constructor() {
        this.setupLogoutCleanup()
        this.waitForUserAndRunMigration()
    }

    private setupLogoutCleanup(): void {
        this.appwriteService.onLogout.subscribe(() => {
            sessionStorage.removeItem(this.MIGRATION_KEY)
        })
    }

    private waitForUserAndRunMigration(): void {
        this.appwriteService._user
            .pipe(
                filter(user => !!user && user.$id !== 'fake-user-id'),
                take(1)
            )
            .subscribe(() => {
                this.runMigrationOnce()
            })
    }

    private async runMigrationOnce(): Promise<void> {
        if (sessionStorage.getItem(this.MIGRATION_KEY) === 'true') {
            return
        }

        try {
            console.log('🚀 Running database migration...')
            await this.databaseService.migrateComputationsToStateField()
            sessionStorage.setItem(this.MIGRATION_KEY, 'true')
            console.log('✅ Migration completed!')
        } catch (error) {
            console.error('❌ Migration failed:', error)
        }
    }
}
