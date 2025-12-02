import { animate, state, style, transition, trigger } from '@angular/animations'
import { CommonModule } from '@angular/common'
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, TemplateRef, ViewChild, inject } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { ActivatedRoute } from '@angular/router'
import { AppwriteService } from '@app/auth/appwrite.service'
import { Source } from '@app/types/sources/sources.type'
import { derivePluginNameFromId } from '@app/utils/string.utils'
import { TranslocoModule, TranslocoService } from '@jsverse/transloco'
import { TippyDirective } from '@ngneat/helipopper'
import { Models } from 'appwrite'
import { ChevronsDown, ChevronsUp, CircleX, CloudOff, DiamondPlus, LucideAngularModule } from 'lucide-angular'
import { MarkdownModule } from 'ngx-markdown'
import { NgScrollbarModule } from 'ngx-scrollbar'
import { Observable, Subscription, catchError, map, of, switchMap, tap, throwError } from 'rxjs'
import { ComputationsIndexComponent } from '../computations-index/computations-index.component'
import { ReportService } from '../report/report.service'
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
        LucideAngularModule,
        TranslocoModule
    ],
    animations: [
        trigger('accordion', [
            state(
                'collapsed',
                style({
                    height: '0',
                    overflow: 'hidden',
                    opacity: '0',
                    padding: '0'
                })
            ),
            state(
                'expanded',
                style({
                    height: '*',
                    overflow: 'visible',
                    opacity: '1'
                })
            ),
            transition('collapsed <=> expanded', animate('300ms ease-in-out'))
        ])
    ]
})
export class PluginComponent implements AfterViewInit, OnDestroy {
    private pluginService = inject(PluginService)
    private route = inject(ActivatedRoute)
    private cdr = inject(ChangeDetectorRef)
    private appwriteService = inject(AppwriteService)
    private dialog = inject(MatDialog)
    private reportService = inject(ReportService)
    private translocoService = inject(TranslocoService)

    @ViewChild('pluginMethodologyDialog') pluginMethodologyDialog!: TemplateRef<Plugin>
    @ViewChild('pluginCreditsDialog') pluginCreditsDialog!: TemplateRef<Plugin>

    pluginObs$: Observable<Plugin> | undefined
    computeState: ComputeState = 'inactive'
    loading = true
    isPurposeExpanded = false
    shortPurpose = ''
    isReportVisible = false

    private reportVisibilitySubscription: Subscription | undefined

    user: Models.User<Models.Preferences> | null = null

    readonly ChevronsUp = ChevronsUp
    readonly ChevronsDown = ChevronsDown
    readonly DiamondPlus = DiamondPlus
    readonly CircleX = CircleX
    readonly CloudOff = CloudOff

    ngAfterViewInit(): void {
        this.loadPluginDetails()

        this.pluginService.getComputeState().subscribe(computeState => {
            this.computeState = computeState
            this.cdr.detectChanges()
            this.isPurposeExpanded = false
        })

        this.appwriteService._user.subscribe(user => {
            this.user = user
        })

        this.reportVisibilitySubscription = this.reportService.isVisible$.subscribe(isVisible => {
            this.isReportVisible = isVisible
        })
    }

    ngOnDestroy(): void {
        if (this.reportVisibilitySubscription) {
            this.reportVisibilitySubscription.unsubscribe()
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
            switchMap(pluginId => {
                if (!pluginId || pluginId == '') {
                    throw Error(`Plugin ${pluginId} does not exist`)
                }

                this.loading = true

                return this.pluginService.getPluginDetails(pluginId).pipe(
                    tap(this.processSourceUrls),
                    tap(plugin => {
                        plugin.assets.icon = this.pluginService.getIconUrl(plugin.plugin_id)
                        this.shortPurpose = this.extractFirstSentence(plugin.purpose)
                        this.loading = false
                        return plugin
                    }),
                    catchError(error => {
                        this.loading = false
                        if (error.status === 404) {
                            const displayName = derivePluginNameFromId(pluginId)

                            const plugin: Plugin = {
                                name: displayName,
                                plugin_id: pluginId,
                                version: 'N/A',
                                library_version: 'N/A',
                                teaser: 'This plugin is currently offline. Previous computations are still available.',
                                purpose: 'This plugin is currently offline. Previous computations are still available.',
                                methodology: 'Plugin is offline',
                                authors: [],
                                concerns: [],
                                demo_config: null,
                                sources: null,
                                assets: {
                                    icon: this.pluginService.getIconUrl(pluginId || '')
                                },
                                operator_schema: {},
                                status: 'unavailable'
                            }
                            this.shortPurpose = this.extractFirstSentence(plugin.purpose)
                            return of(plugin)
                        }
                        return throwError(() => error)
                    })
                )
            })
        )
    }

    enterComputeState() {
        if (this.isReportVisible) {
            const confirmMessage = this.translocoService.translate('plugin.reportExitConfirm.message')
            if (confirm(confirmMessage)) {
                this.reportService.closeReport()
            } else {
                return
            }
        }

        this.pluginService.setComputeState('compute-ready')
        this.pluginService.collapsePluginCatalog()
    }

    exitComputeState() {
        this.pluginService.setComputeState('inactive')
    }

    extractFirstSentence(text: string): string {
        const firstSentenceMatch = text.match(/(.*?)[.!?](\s|$)/)
        return firstSentenceMatch ? firstSentenceMatch[0] : text
    }

    togglePurposeExpand(): void {
        this.isPurposeExpanded = !this.isPurposeExpanded
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

    openDialog(plugin: Plugin): void {
        this.dialog.open(this.pluginMethodologyDialog, {
            data: plugin,
            autoFocus: false
        })
    }

    openCreditsDialog(plugin: Plugin): void {
        this.dialog.open(this.pluginCreditsDialog, {
            data: plugin,
            autoFocus: false
        })
    }

    closeDialog(): void {
        this.dialog.closeAll()
    }
}
