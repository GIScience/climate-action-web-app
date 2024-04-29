import {Component} from '@angular/core'
import {default as packageInfo} from '../../package.json'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent  {
    title = 'Climate Action Platform'
    name = 'HeiGIT'
    version: string = packageInfo.version
}
