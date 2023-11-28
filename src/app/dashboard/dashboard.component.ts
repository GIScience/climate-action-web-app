import {Component} from '@angular/core'
import {ArtifactComponent} from '../artifact/artifact.component'
import {PluginsComponent} from '../plugins/plugins.component'
import {ReportComponent} from '../report/report.component'

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [
        ArtifactComponent,
        PluginsComponent,
        ReportComponent
    ],
    standalone: true
})
export class DashboardComponent {

}
