import { NgOptimizedImage } from '@angular/common'
import { AfterViewInit, Component } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatDateFnsModule } from '@angular/material-date-fns-adapter'
import { MatDialogModule } from '@angular/material/dialog'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatInputModule } from '@angular/material/input'
import { RouterLink, RouterOutlet } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { FormlyModule } from '@ngx-formly/core'
import { FormlyMaterialModule } from '@ngx-formly/material'
import { FormlyMatDatepickerModule } from '@ngx-formly/material/datepicker'
import { LucideAngularModule } from 'lucide-angular'
import { MarkdownModule } from 'ngx-markdown'
import { default as packageInfo } from '../../package.json'
import { AccountComponent } from './account/account.component'
import { DashboardService } from './dashboard/dashboard.service'
import { TourEngine } from './dashboard/walkthrough/tour-engine.service'
import { LanguageComponent } from './language/language.component'
import { MigrationService } from './migration.service'
import { MobileWarningComponent } from './mobile-warning/mobile-warning.component'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [
        MatInputModule,
        NgOptimizedImage,
        FormsModule,
        ReactiveFormsModule,
        RouterOutlet,
        RouterLink,
        FormlyMaterialModule,
        MatDateFnsModule,
        MatExpansionModule,
        MobileWarningComponent,
        MatDialogModule,
        AccountComponent,
        LanguageComponent,
        FormlyModule,
        FormlyMatDatepickerModule,
        MarkdownModule,
        LucideAngularModule,
        TranslocoModule
    ]
})
export class AppComponent implements AfterViewInit {
    title = 'Climate Action Navigator'
    name = 'HeiGIT'
    version: string = packageInfo.version

    currentYear(): number {
        return new Date().getFullYear()
    }

    constructor(
        private dashboardService: DashboardService,
        private tourEngine: TourEngine,
        _migrationService: MigrationService
    ) {}

    ngAfterViewInit(): void {
        this.tourEngine.checkForPendingTour()
    }

    clearDashboardState() {
        this.dashboardService.clearDashboardState()
    }
}
