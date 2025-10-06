import { TranslocoService } from '@jsverse/transloco'
import { IControl, Map, StyleSpecification } from 'maplibre-gl'
import { Subscription } from 'rxjs'

export interface MapStyle {
    title: string
    uri: string | StyleSpecification
}

export class MapStyleSwitcherControl implements IControl {
    private map?: Map
    private controlContainer?: HTMLDivElement
    private mapStyleContainer?: HTMLDivElement
    private layerControlsContainer?: HTMLDivElement
    private isExpanded: boolean = true
    private readonly styleDataListener = () => this.updateMapLabelsLanguage()
    private baseMapsHeading?: HTMLHeadingElement
    private layersHeading?: HTMLHeadingElement
    private subscriptions: Subscription[] = []

    constructor(
        private styles: MapStyle[],
        private defaultStyle: string,
        private translocoService: TranslocoService,
        private onStyleChange?: (styleName: string) => void,
        private onStateChange?: (isExpanded: boolean) => void,
        initialExpanded: boolean = true
    ) {
        this.isExpanded = initialExpanded
    }

    onAdd(map: Map): HTMLElement {
        this.map = map
        const container = this.createContainer()
        this.setupTranslations()
        this.map?.on('styledata', this.styleDataListener)
        this.updateMapLabelsLanguage()
        return (this.controlContainer = container)
    }

    onRemove(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe())
        this.subscriptions = []
        if (this.map) {
            this.map.off('styledata', this.styleDataListener)
        }
        this.controlContainer?.remove()
        this.map = undefined
    }

    private setupTranslations(): void {
        this.subscriptions.push(
            this.translocoService.selectTranslate('map.baseMaps').subscribe(translation => {
                if (this.baseMapsHeading) {
                    this.baseMapsHeading.textContent = translation
                }
            })
        )

        this.subscriptions.push(
            this.translocoService.selectTranslate('map.layers').subscribe(translation => {
                if (this.layersHeading) {
                    this.layersHeading.textContent = translation
                }
            })
        )

        this.subscriptions.push(
            this.translocoService.langChanges$.subscribe(() => {
                this.updateMapLabelsLanguage()
            })
        )
    }

    private createContainer(): HTMLDivElement {
        const container = Object.assign(document.createElement('div'), {
            className: `maplibregl-ctrl maplibregl-ctrl-group maplibregl-style-switcher-container ${this.isExpanded ? 'expanded' : ''}`
        })

        const panelContainer = Object.assign(document.createElement('div'), {
            className: 'panel-container'
        })

        panelContainer.append(
            (this.layerControlsContainer = this.createLayerControlsContainer()),
            (this.mapStyleContainer = this.createStyleList())
        )

        container.append(this.createStyleButton(), panelContainer)

        return container
    }

    private createStyleButton(): HTMLButtonElement {
        return Object.assign(document.createElement('button'), {
            type: 'button',
            className: 'maplibregl-ctrl-icon maplibregl-style-switcher',
            onclick: () => {
                this.isExpanded = !this.isExpanded
                this.controlContainer!.classList.toggle('expanded', this.isExpanded)
                this.onStateChange?.(this.isExpanded)
            }
        })
    }

    private createStyleList(): HTMLDivElement {
        const container = Object.assign(document.createElement('div'), {
            className: 'maplibregl-style-list'
        })

        this.baseMapsHeading = document.createElement('h3')
        container.appendChild(this.baseMapsHeading)
        this.styles.forEach(style => {
            const button = Object.assign(document.createElement('button'), {
                type: 'button',
                innerText: style.title,
                className:
                    style.title.replace(/[^a-z0-9-]/gi, '_') + (style.title === this.defaultStyle ? ' active' : ''),
                onclick: () => this.handleStyleChange(button)
            })
            button.dataset['uri'] = typeof style.uri === 'string' ? style.uri : JSON.stringify(style.uri)
            button.dataset['title'] = style.title
            container.appendChild(button)
        })
        return container
    }

    private handleStyleChange(button: HTMLButtonElement): void {
        if (button.classList.contains('active')) return
        const styleUri = button.dataset['uri']!
        const style = styleUri.startsWith('assets/') ? styleUri : JSON.parse(styleUri)

        this.map!.setStyle(style, {
            transformStyle: (previousStyle, nextStyle) => {
                if (!previousStyle || !nextStyle) {
                    return nextStyle || {}
                }

                const customLayers = (previousStyle.layers || []).filter(
                    layer =>
                        /^(custom-|geojson-|geotiff-|region-|selected-|focused-|hover-highlight)/.test(layer.id) ||
                        layer.id === 'markers'
                )

                const layers = (nextStyle.layers || []).concat(customLayers)

                const sources = { ...(nextStyle.sources || {}) }
                Object.entries(previousStyle.sources || {}).forEach(([key, value]) => {
                    if (
                        /^(custom-|source-geojson-|source-geotiff-|region-|selected-|focused-|hover-highlight)/.test(
                            key
                        ) ||
                        key === 'markers'
                    )
                        sources[key] = value
                })

                return {
                    ...nextStyle,
                    sources,
                    layers
                }
            }
        })

        this.mapStyleContainer!.querySelectorAll('.active').forEach(el => el.classList.remove('active'))
        button.classList.add('active')
        this.onStyleChange?.(button.dataset['title']!)
    }

    private createLayerControlsContainer(): HTMLDivElement {
        return Object.assign(document.createElement('div'), {
            className: 'maplibregl-layer-controls',
            style: 'display:none;'
        })
    }

    private updateMapLabelsLanguage(): void {
        if (!this.map) return

        const currentLang = this.translocoService.getActiveLang()
        const langSuffix = currentLang === 'en' ? '_en' : currentLang === 'de' ? '_de' : '_en'
        const currentStyle = this.map.getStyle()

        if (!currentStyle || !currentStyle.layers) return

        const isVectorStyle = this.isVectorStyleActive()
        if (!isVectorStyle) return

        currentStyle.layers.forEach(layer => {
            if ('layout' in layer && layer.layout && 'text-field' in layer.layout) {
                const textField = layer.layout['text-field']
                if (typeof textField === 'string') {
                    if (textField === '{name}') {
                        this.map!.setLayoutProperty(layer.id, 'text-field', `{name${langSuffix}}`)
                    } else if (textField.match(/^{name_(en|de)}$/)) {
                        this.map!.setLayoutProperty(layer.id, 'text-field', `{name${langSuffix}}`)
                    }
                }
            }
        })
    }

    private isVectorStyleActive(): boolean {
        if (!this.mapStyleContainer) return false
        const activeButton = this.mapStyleContainer.querySelector('.active') as HTMLButtonElement
        if (!activeButton) return false
        const styleUri = activeButton.dataset['uri']
        return (
            styleUri !== undefined &&
            (styleUri.includes('colorful/style.json') || styleUri.includes('graybeard/style.json'))
        )
    }

    updateLayerControls(): void {
        if (!this.map || !this.layerControlsContainer) return
        const groups: { [key: string]: string[] } = {}
        this.map
            .getStyle()
            .layers.filter(l => l.id.match(/^(geojson|geotiff)-.*-\d+/))
            .forEach(l => {
                const base = l.id.match(/^((?:geojson|geotiff)-[^-]+-\d+)/)?.[1]
                if (base) (groups[base] ??= []).push(l.id)
            })
        const keys = Object.keys(groups)
        this.layerControlsContainer.style.display = keys.length ? 'block' : 'none'
        this.layerControlsContainer.innerHTML = ''
        this.layersHeading = document.createElement('h3')
        this.layersHeading.textContent = this.translocoService.translate('map.layers')
        this.layerControlsContainer.appendChild(this.layersHeading)

        keys.forEach(base => {
            const div = Object.assign(document.createElement('div'), { className: 'map-layer' })
            div.innerHTML = `
            <div class="map-layer-header">
                <label>
                    ${base.replace(/^(geojson|geotiff)-|-\d+$/g, '')}
                </label>
                <span>
                    80%
                </span>
            </div>
            <input type="range" min="0" max="1" step="0.1" value="0.8" style="width:100%;cursor:pointer">`
            const slider = div.querySelector('input') as HTMLInputElement
            const span = div.querySelector('span') as HTMLSpanElement
            slider.oninput = () => {
                const v = +slider.value
                span.textContent = `${Math.round(v * 100)}%`
                groups[base].forEach(id => {
                    const layer = this.map!.getLayer(id)
                    if (!layer) return

                    this.map!.setPaintProperty(id, `${layer.type}-opacity`, v)

                    if (layer.type === 'circle') {
                        this.map!.setPaintProperty(id, 'circle-stroke-opacity', v)
                    }
                })
            }
            slider.dispatchEvent(new Event('input'))
            this.layerControlsContainer!.appendChild(div)
        })
    }
}
