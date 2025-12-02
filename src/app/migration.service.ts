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
        this.waitForUserAndRunMigration()
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
        const migrationCompleted = localStorage.getItem(this.MIGRATION_KEY)
        if (migrationCompleted === 'true') {
            return
        }

        try {
            console.log('🚀 Auto-running database migration after user login...')
            console.log('This will set the state field based on existing ARCHIVED flags')

            await this.databaseService.migrateComputationsToStateField()

            // Mark migration as completed
            localStorage.setItem(this.MIGRATION_KEY, 'true')
            console.log('✅ Migration completed successfully!')
        } catch (error) {
            console.error('❌ Migration failed:', error)
        }
    }
}
