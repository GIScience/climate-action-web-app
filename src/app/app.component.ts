import {Component, ViewEncapsulation} from '@angular/core'
import {default as packageInfo} from '../../package.json'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AppComponent  {
    title = 'Climate Action Platform'
    name = 'HeiGIT'
    version: string = packageInfo.version

    currentYear(): number {
        return new Date().getFullYear()
    }
}
