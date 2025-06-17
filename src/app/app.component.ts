import { AfterViewInit, Component } from '@angular/core'
import { default as packageInfo } from '../../package.json'
import { DashboardService } from './dashboard/dashboard.service'
import { TourEngine } from './dashboard/walkthrough/tour-engine.service'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
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
        private tourEngine: TourEngine
    ) {}

    ngAfterViewInit(): void {
        this.tourEngine.checkForPendingTour()
    }

    clearDashboardState() {
        this.dashboardService.clearDashboardState()
    }
}
