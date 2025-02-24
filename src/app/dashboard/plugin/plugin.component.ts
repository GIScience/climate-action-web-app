import { CommonModule } from '@angular/common'
import { AfterViewInit, ChangeDetectorRef, Component, TemplateRef, ViewChild } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { ActivatedRoute } from '@angular/router'
import { Source } from '@app/types/sources/sources.type'
import { TippyDirective } from '@ngneat/helipopper'
import { CircleX, CloudOff, LucideAngularModule, RedoDot } from 'lucide-angular'
import { MarkdownModule } from 'ngx-markdown'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs'
import { ComputationsIndexComponent } from '../computations-index/computations-index.component'
import { PluginParameterComponent } from './plugin-parameter/plugin-parameter.component'
import { ComputeState, Plugin } from './plugin.interface'
import { PluginService } from './plugin.service'

@Component({
    selector: 'app-plugin',
    templateUrl: './plugin.component.html',
    styleUrls: ['./plugin.component.scss'],
    imports: [
        CommonModule,
        MarkdownModule,
        ComputationsIndexComponent,
        PluginParameterComponent,
        TippyDirective,
        NgScrollbarModule,
        LucideAngularModule
    ],
    standalone: true
})
export class PluginComponent implements AfterViewInit {
    pluginObs$: Observable<Plugin> | undefined
    computeState: ComputeState = 'inactive'
    loading = true

    readonly RedoDot = RedoDot
    readonly CircleX = CircleX
    readonly CloudOff = CloudOff

    @ViewChild('pluginContentDialog') pluginContentDialog!: TemplateRef<Plugin>

    constructor(
        private pluginService: PluginService,
        private route: ActivatedRoute,
        private dialog: MatDialog,
        private cdr: ChangeDetectorRef
    ) {}

    ngAfterViewInit(): void {
        this.loadPluginDetails()

        this.pluginService.getComputeState().subscribe(computeState => {
            this.computeState = computeState
            this.cdr.detectChanges()
        })
    }

    processSourceText(source: Source) {
        const commonFields = [source.author, source.year]

        switch (source.ENTRYTYPE) {
            case 'article':
                return [...commonFields, source.journal, source.volume, source.pages].filter(Boolean).join(', ')
            case 'inbook':
            case 'inproceedings':
                return [...commonFields, source.pages].filter(Boolean).join(', ')
            case 'misc':
                return [...commonFields].filter(Boolean).join(', ')
            default:
                return ''
        }
    }

    processSourceUrls(plugin: Plugin) {
        if (plugin.sources) {
            plugin.sources = plugin.sources.map(y => {
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

                this.loading = true

                return this.pluginService.getPluginDetails(pluginName).pipe(
                    tap(this.processSourceUrls),
                    tap(plugin => {
                        plugin.assets.icon = this.pluginService.getIconUrl(plugin.plugin_id, plugin.version)
                        this.loading = false
                        return plugin
                    }),
                    catchError(error => {
                        this.loading = false
                        if (error.status === 404) {
                            // Create offline plugin name based on route, to be removed when API is updated
                            const displayName = pluginName
                                .split('_')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ')

                            const plugin: Plugin = {
                                name: displayName,
                                plugin_id: pluginName,
                                version: 'N/A',
                                library_version: 'N/A',
                                purpose: 'This plugin is currently offline. Previous computations are still available.',
                                methodology: 'Plugin is offline',
                                authors: [],
                                concerns: [],
                                assets: {
                                    icon: this.pluginService.getIconUrl(pluginName || '', 'N/A')
                                },
                                operator_schema: {},
                                status: 'unavailable'
                            }
                            return of(plugin)
                        }
                        return throwError(() => error)
                    })
                )
            })
        )
    }

    enableCompute() {
        this.pluginService.setComputeState('compute-ready')
        this.pluginService.collapsePluginCatalog()
    }

    openDialog(plugin: Plugin): void {
        this.dialog.open(this.pluginContentDialog, {
            data: plugin,
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
