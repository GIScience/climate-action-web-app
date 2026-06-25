import { NgOptimizedImage } from '@angular/common'
import { AfterViewInit, Component, inject, OnInit } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatDateFnsModule } from '@angular/material-date-fns-adapter'
import { MatDialogModule } from '@angular/material/dialog'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatInputModule } from '@angular/material/input'
import { Title } from '@angular/platform-browser'
import { RouterLink, RouterOutlet } from '@angular/router'
import { environment } from '@environments/environment'
import { TranslocoModule } from '@jsverse/transloco'
import { FormlyModule } from '@ngx-formly/core'
import { FormlyMaterialModule } from '@ngx-formly/material'
import { FormlyMatDatepickerModule } from '@ngx-formly/material/datepicker'
import { LucideAngularModule } from 'lucide-angular'
import { default as packageInfo } from '../../package.json'
import { AccountComponent } from './account/account.component'
import { DashboardService } from './dashboard/dashboard.service'
import { StatusAnnouncementsService } from './dashboard/status-announcements/status-announcements.service'
import { StatusNoticesComponent } from './dashboard/status-announcements/status-notices.component'
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
        LucideAngularModule,
        TranslocoModule,
        StatusNoticesComponent
    ]
})
export class AppComponent implements OnInit, AfterViewInit {
    private dashboardService = inject(DashboardService)
    private tourEngine = inject(TourEngine)
    private titleService = inject(Title)
    private statusAnnouncements = inject(StatusAnnouncementsService)

    readonly notices = this.statusAnnouncements.notices

    constructor() {
        void inject(MigrationService)
    }

    title = 'Climate Action Navigator'
    name = 'HeiGIT'
    version: string = packageInfo.version

    ngOnInit(): void {
        if (environment.environmentType !== 'production') {
            const prefix = environment.environmentType.toUpperCase()
            this.titleService.setTitle(`[${prefix}] ${this.title}`)
        }

        this.statusAnnouncements.showActiveAnnouncements()
    }

    currentYear(): number {
        return new Date().getFullYear()
    }

    ngAfterViewInit(): void {
        this.tourEngine.checkForPendingTour()
    }

    clearDashboardState() {
        this.dashboardService.clearDashboardState()
    }
}
