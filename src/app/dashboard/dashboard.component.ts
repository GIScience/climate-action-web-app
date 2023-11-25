import {Component} from '@angular/core'
import {ArtifactsComponent} from "../artifacts/artifacts.component"
import {PluginsComponent} from "../plugins/plugins.component"
import {ReportComponent} from "../report/report.component"

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [ArtifactsComponent, PluginsComponent, ReportComponent],
    standalone: true
})
export class DashboardComponent {

}
