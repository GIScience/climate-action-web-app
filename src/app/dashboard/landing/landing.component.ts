import {Component} from '@angular/core'
import {PluginService} from '../plugin/plugin.service' 

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.scss'
})

export class LandingComponent {

    constructor(
        private pluginService: PluginService
    ) {}

    explorePlugins() {
        this.pluginService.openPluginCatalog()
    }
}