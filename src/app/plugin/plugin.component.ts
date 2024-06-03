import {AfterViewInit, Component} from '@angular/core'
import {ActivatedRoute} from '@angular/router'
import {Plugin, Source} from './plugin.interface'
import {PluginService} from './plugin.service'
import {map, Observable, switchMap, tap} from 'rxjs'
import {PluginParameterComponent} from './plugin-parameter/plugin-parameter.component'
import {CommonModule} from '@angular/common'
import {MarkdownModule} from 'ngx-markdown'

@Component({
    selector: 'app-plugin',
    templateUrl: './plugin.component.html',
    styleUrls: ['./plugin.component.scss'],
    imports: [
        CommonModule,
        MarkdownModule,
        PluginParameterComponent
    ],
    standalone: true
})
export class PluginComponent implements AfterViewInit {
    pluginObs$: Observable<Plugin> | undefined

    constructor(
        private pluginService: PluginService,
        private route: ActivatedRoute
    ) {
    }

    ngAfterViewInit(): void {
        this.loadPluginDetails()
    }

    computeSourceText(source: Source) {
        return [source.author, source.journal, source.year, source.volume, source.pages]
            .flatMap(f => f ? [f] : [])
            .join(', ')
    }

    adjust(plugin: Plugin) {
        plugin.sources = plugin.sources.map((y) => {
            if (!y.url && y.note) {
                const noteUrlMatch = y.note.match('\\url{(.*)}')
                if (noteUrlMatch) {
                    y.url = noteUrlMatch[1]
                }
            }
            return y
        })
        return plugin
    }

    private loadPluginDetails() {
        this.pluginObs$ = this.route.paramMap.pipe(
            map(params => params.get('name')),
            switchMap(pluginName => {
                if (!pluginName || pluginName == '') {
                    throw Error(`Plugin ${pluginName} does not exist`)
                }

                return this.pluginService.getPluginDetails(pluginName).pipe(tap(this.adjust))
            })
        )
    }
}
