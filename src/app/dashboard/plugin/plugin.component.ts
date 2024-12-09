import {AfterViewInit, ChangeDetectorRef, Component, TemplateRef, ViewChild} from '@angular/core'
import {ActivatedRoute} from '@angular/router'
import {Plugin, PluginState, Source} from './plugin.interface'
import {PluginService} from './plugin.service'
import {map, Observable, switchMap, tap} from 'rxjs'
import {TippyDirective} from '@ngneat/helipopper'
import {ArtifactComponent} from '../artifact/artifact.component'
import {PluginParameterComponent} from './plugin-parameter/plugin-parameter.component'
import {CommonModule} from '@angular/common'
import {MarkdownModule} from 'ngx-markdown'
import {NgScrollbarModule} from 'ngx-scrollbar'
import {CircleX, LucideAngularModule, RedoDot} from 'lucide-angular'
import {MatDialog} from '@angular/material/dialog'

@Component({
    selector: 'app-plugin',
    templateUrl: './plugin.component.html',
    styleUrls: ['./plugin.component.scss'],
    imports: [
        CommonModule,
        MarkdownModule,
        ArtifactComponent,
        PluginParameterComponent,
        TippyDirective,
        NgScrollbarModule,
        LucideAngularModule
    ],
    standalone: true
})
export class PluginComponent implements AfterViewInit {
    pluginObs$: Observable<Plugin> | undefined
    pluginState: PluginState = 'inactive'

    readonly RedoDot = RedoDot
    readonly CircleX = CircleX

    @ViewChild('pluginContentDialog') pluginContentDialog!: TemplateRef<{
        purpose: string,
        methodology: string,
        sources: Source[]
    }>

    constructor(
        private pluginService: PluginService,
        private route: ActivatedRoute,
        private dialog: MatDialog,
        private cdr: ChangeDetectorRef
    ) {
    }

    ngAfterViewInit(): void {
        this.loadPluginDetails()

        this.pluginService.getPluginState().subscribe(pluginState => {
            this.pluginState = pluginState
            this.cdr.detectChanges()
        })
    }

    computeSourceText(source: Source) {
        return [source.author, source.journal, source.year, source.volume, source.pages]
            .flatMap(f => f ? [f] : [])
            .join(', ')
    }

    processSourceUrls(plugin: Plugin) {
        if (plugin.sources) {
            plugin.sources = plugin.sources.map((y) => {
                if (!y.url && y.note) {
                    const noteUrlMatch = y.note.match('\\url{(.*)}')
                    if (noteUrlMatch) {
                        y.url = noteUrlMatch[1]
                    }
                }
                return y
            })
        }
        return plugin
    }

    private loadPluginDetails() {
        this.pluginObs$ = this.route.paramMap.pipe(
            map(params => params.get('name')),
            switchMap(pluginName => {
                if (!pluginName || pluginName == '') {
                    throw Error(`Plugin ${pluginName} does not exist`)
                }

                let pluginDetails = this.pluginService.getPluginDetails(pluginName)
                pluginDetails = pluginDetails.pipe(tap(this.processSourceUrls))
                pluginDetails = pluginDetails.pipe(tap(plugin => {
                    plugin.assets.icon = this.pluginService.getIconUrl(plugin.plugin_id, plugin.version)
                    return plugin
                }))
                return pluginDetails
            })
        )
    }

    enableCompute() {
        this.pluginService.setPluginState('compute-ready')
        this.pluginService.closePluginCatalog()
    }

    openDialog(plugin: Plugin): void {
        this.dialog.open(this.pluginContentDialog, {
            data: {purpose: plugin.purpose, methodology: plugin.methodology, sources: plugin.sources},
            autoFocus: false
        })
    }

    closeDialog(): void {
        this.dialog.closeAll()
    }

    extractFirstSentence(text: string): string {
        const firstSentenceMatch = text.match(/(.*?)[.!?](\s|$)/)
        return firstSentenceMatch ? firstSentenceMatch[0] : text
    }
}
