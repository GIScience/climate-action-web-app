import {AfterViewInit, Component} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {Plugin} from './plugin.interface';
import {PluginService} from "../services/plugin.service";
import {map, Observable, switchMap} from "rxjs";

@Component({
    selector: 'app-plugin',
    templateUrl: './plugin.component.html',
    styleUrls: ['./plugin.component.scss']
})
export class PluginComponent implements AfterViewInit {
    pluginObs$: Observable<Plugin> | undefined;

    constructor(
        private pluginService: PluginService,
        private route: ActivatedRoute
    ) {
    }

    ngAfterViewInit(): void {
        this.loadPluginDetails()
    }

    private loadPluginDetails() {
        this.pluginObs$ = this.route.paramMap.pipe(
            map(params => params.get('name')),
            switchMap(pluginName => {
                if (!pluginName || pluginName == '') {
                    throw Error(`Plugin ${pluginName} does not exist`)
                }
                return this.pluginService.getPluginDetails(pluginName)
            })
        );
    }
}
