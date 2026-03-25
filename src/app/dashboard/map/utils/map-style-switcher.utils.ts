import { TranslocoService } from '@jsverse/transloco'
import { ControlPosition, IControl, LayerSpecification, Map as MaplibreMap, StyleSpecification } from 'maplibre-gl'
import { Subscription } from 'rxjs'
import type { Artifact, ArtifactEntity } from '../../artifact/artifact.interface'
import type { MapArtifactLayer } from '../map-artifact-manager.service'

export interface MapStyle {
    title: string
    style: StyleSpecification
}

export class MapStyleSwitcherControl implements IControl {
    private map?: MaplibreMap
    private controlContainer?: HTMLDivElement
    private mapStyleContainer?: HTMLDivElement
    private layerControlsContainer?: HTMLDivElement
    private styleMap = new Map<string, StyleSpecification>()
    private baseLayerIds = new Set<string>()
    private isExpanded: boolean = true
    private readonly styleDataListener = () => this.updateMapLabelsLanguage()
    private baseMapsHeading?: HTMLHeadingElement
    private layersHeading?: HTMLHeadingElement
    private subscriptions: Subscription[] = []
    private getActiveLayers?: () => MapArtifactLayer[]
    private removeMapLayer?: (layer: MapArtifactLayer) => void
    private promoteToPin?: (artifact: ArtifactEntity) => boolean
    private unpinArtifact?: (artifact: ArtifactEntity, computationId?: string) => boolean
    private isArtifactActive?: (artifact: Artifact) => boolean

    constructor(
        private styles: MapStyle[],
        private defaultStyle: string,
        private translocoService: TranslocoService,
        private onStyleChange?: (styleName: string) => void,
        private onStateChange?: (isExpanded: boolean) => void,
        initialExpanded: boolean = true,
        getActiveLayers?: () => MapArtifactLayer[],
        removeMapLayer?: (layer: MapArtifactLayer) => void,
        promoteToPin?: (artifact: ArtifactEntity) => boolean,
        unpinArtifact?: (artifact: ArtifactEntity, computationId?: string) => boolean,
        isArtifactActive?: (artifact: Artifact) => boolean
    ) {
        this.isExpanded = initialExpanded
        styles.forEach(s => s.style.layers?.forEach(l => this.baseLayerIds.add(l.id)))
        this.getActiveLayers = getActiveLayers
        this.removeMapLayer = removeMapLayer
        this.promoteToPin = promoteToPin
        this.unpinArtifact = unpinArtifact
        this.isArtifactActive = isArtifactActive
    }

    onAdd(map: MaplibreMap): HTMLElement {
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
        this.styleMap.clear()
        this.controlContainer?.remove()
        this.map = undefined
    }

    getDefaultPosition(): ControlPosition {
        return 'bottom-right'
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
            this.styleMap.set(style.title, style.style)
            const button = Object.assign(document.createElement('button'), {
                type: 'button',
                innerText: style.title,
                className:
                    style.title.replace(/[^a-z0-9-]/gi, '_') + (style.title === this.defaultStyle ? ' active' : ''),
                onclick: () => this.handleStyleChange(button)
            })
            button.dataset['title'] = style.title
            container.appendChild(button)
        })
        return container
    }

    private handleStyleChange(button: HTMLButtonElement): void {
        if (button.classList.contains('active')) return
        const title = button.dataset['title']!
        const style = this.styleMap.get(title)
        if (!style) return

        this.map!.setStyle(style, {
            transformStyle: (previousStyle, nextStyle) => {
                if (!previousStyle || !nextStyle) {
                    return nextStyle || {}
                }

                const nextLayerMap = new Map((nextStyle.layers || []).map(l => [l.id, l]))

                // Step through the current layer ordering:
                // - Base layers present in next style (e.g. Vector Base Layer) → swap in-place
                // - Custom layers → keep at their z-position
                // - Old base layers not in next style (e.g. Raster Base Layer) → drop
                const walkedLayers = (previousStyle.layers || []).flatMap(layer => {
                    const replacement = nextLayerMap.get(layer.id)
                    if (replacement) {
                        nextLayerMap.delete(layer.id)
                        // Only swap paint; keep current layout (preserves localized labels etc.)
                        return [{ ...layer, paint: replacement.paint } as LayerSpecification]
                    }
                    return this.baseLayerIds.has(layer.id) ? [] : [layer]
                })

                // Unmatched new base layers go at the bottom so custom layers render on top
                const layers: LayerSpecification[] = [...nextLayerMap.values(), ...walkedLayers]

                // New base sources + only previous sources still referenced by a layer in the result
                const referencedSources = new Set(
                    layers.map(l => ('source' in l ? l.source : undefined)).filter(Boolean)
                )
                const sources = { ...(nextStyle.sources || {}) }
                for (const [id, source] of Object.entries(previousStyle.sources || {})) {
                    if (referencedSources.has(id) && !sources[id]) {
                        sources[id] = source
                    }
                }

                return {
                    ...nextStyle,
                    // Preserve projection — setProjection(undefined) crashes MapLibre's
                    // diff when globe is active, forcing a full style rebuild.
                    // TODO: Remove once https://github.com/maplibre/maplibre-gl-js/issues/7314 is fixed
                    projection: previousStyle.projection,
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
        const localizedField = `name${langSuffix}`
        const currentStyle = this.map.getStyle()

        if (!currentStyle?.layers || !this.isVectorStyleActive()) return

        const localizedExpression = [
            'case',
            ['to-boolean', ['get', localizedField]],
            ['get', localizedField],
            ['get', 'name']
        ]

        currentStyle.layers.forEach(layer => {
            if (!('layout' in layer) || !layer.layout) return
            const textField = (layer.layout as Record<string, unknown>)['text-field']
            if (!Array.isArray(textField)) return

            const isGetName =
                textField[0] === 'get' && typeof textField[1] === 'string' && /^name(_en|_de)?$/.test(textField[1])
            const isCaseName =
                textField[0] === 'case' && Array.isArray(textField.at(-1)) && textField.at(-1)[1] === 'name'

            if (isGetName || isCaseName) {
                this.map!.setLayoutProperty(layer.id, 'text-field', localizedExpression)
            }
        })
    }

    private isVectorStyleActive(): boolean {
        if (!this.mapStyleContainer) return false
        const activeButton = this.mapStyleContainer.querySelector('.active') as HTMLButtonElement
        if (!activeButton) return false
        const title = activeButton.dataset['title']
        return title !== undefined && title !== 'ESRI World Imagery'
    }

    updateLayerControls(): void {
        if (!this.map || !this.layerControlsContainer) return

        const groups: { [key: string]: string[] } = {}
        this.map
            .getStyle()
            .layers.filter(l => l.id.match(/^(geojson|geotiff|pmtiles)-.*-\d{13}/))
            .forEach(l => {
                const base = l.id.match(/^((?:geojson|geotiff|pmtiles)-.*-\d{13})/)?.[1]
                if (base) (groups[base] ??= []).push(l.id)
            })

        const keys = Object.keys(groups)
        this.layerControlsContainer.style.display = keys.length ? 'block' : 'none'
        this.layerControlsContainer.innerHTML = ''
        this.layersHeading = document.createElement('h3')
        this.layersHeading.textContent = this.translocoService.translate('map.layers')
        this.layerControlsContainer.appendChild(this.layersHeading)

        const activeLayers = this.getActiveLayers?.() ?? []

        keys.reverse().forEach(base => {
            const matchingLayer = activeLayers.find(layer => layer.layerIds?.some(id => groups[base].includes(id)))

            let displayName: string
            if (matchingLayer) {
                const shouldPrefix = activeLayers.length > 1 && matchingLayer.aoiName
                displayName = shouldPrefix
                    ? `${matchingLayer.aoiName}: ${matchingLayer.artifact.name}`
                    : matchingLayer.artifact.name
            } else {
                displayName = base.replace(/^(geojson|geotiff|pmtiles)-|-\d+$/g, '')
            }

            const container = Object.assign(document.createElement('div'), { className: 'map-layer' })
            if (matchingLayer && matchingLayer.pinned) {
                container.classList.add('map-layer--pinned')
            }
            const header = Object.assign(document.createElement('div'), { className: 'map-layer-header' })
            const label = document.createElement('label')
            label.textContent = displayName
            header.appendChild(label)

            const actions = Object.assign(document.createElement('div'), { className: 'map-layer-actions' })

            if (matchingLayer) {
                const isPinned = matchingLayer.pinned
                const pinTitleKey = isPinned ? 'map.unpinLayer' : 'map.pinLayer'
                let pinTitle = this.translocoService.translate(pinTitleKey)
                if (!pinTitle || pinTitle === pinTitleKey) {
                    pinTitle = isPinned ? 'Unpin layer' : 'Pin layer for comparison'
                }

                const pinIconSvg =
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#008080" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z"/></svg>'
                const pinOffIconSvg =
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4d0080" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M15 9.34V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1v2.34"/><path d="M6 14a2 2 0 0 0-.3 1.12V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V9"/><line x1="2" x2="22" y1="2" y2="22"/></svg>'

                const pinBtn = Object.assign(document.createElement('button'), {
                    type: 'button',
                    className: isPinned ? 'map-layer-pin map-layer-pin--pinned' : 'map-layer-pin',
                    title: pinTitle
                }) as HTMLButtonElement
                pinBtn.setAttribute('aria-label', pinBtn.title)
                pinBtn.innerHTML = isPinned ? pinOffIconSvg : pinIconSvg

                pinBtn.onclick = () => {
                    if (isPinned) {
                        this.unpinArtifact?.(matchingLayer.artifact)
                        if (!this.isArtifactActive?.(matchingLayer.artifact)) {
                            this.removeMapLayer?.(matchingLayer)
                        }
                    } else {
                        this.promoteToPin?.(matchingLayer.artifact)
                    }
                    setTimeout(() => this.updateLayerControls(), 100)
                }
                actions.appendChild(pinBtn)

                if (this.removeMapLayer) {
                    const removeTitleKey = 'map.removeLayer'
                    let removeTitle = this.translocoService.translate(removeTitleKey)
                    if (!removeTitle || removeTitle === removeTitleKey) {
                        removeTitle = 'Remove from map'
                    }
                    const removeBtn = Object.assign(document.createElement('button'), {
                        type: 'button',
                        className: 'map-layer-remove',
                        title: removeTitle
                    }) as HTMLButtonElement
                    removeBtn.setAttribute('aria-label', removeBtn.title)
                    removeBtn.textContent = '✕'
                    removeBtn.onclick = () => {
                        this.removeMapLayer?.(matchingLayer)
                        setTimeout(() => this.updateLayerControls(), 0)
                    }
                    actions.appendChild(removeBtn)
                }
            }

            header.appendChild(actions)
            container.appendChild(header)

            const sliderContainer = Object.assign(document.createElement('div'), { className: 'slider-container' })
            const sliderTrack = Object.assign(document.createElement('div'), { className: 'slider-track' })
            const sliderFill = Object.assign(document.createElement('div'), { className: 'slider-fill' })
            const sliderHandle = Object.assign(document.createElement('div'), { className: 'slider-handle' })
            const percentage = Object.assign(document.createElement('span'), { className: 'slider-percentage' })

            sliderHandle.appendChild(percentage)
            sliderTrack.appendChild(sliderFill)
            sliderTrack.appendChild(sliderHandle)

            const slider = Object.assign(document.createElement('input'), {
                type: 'range',
                min: '0',
                max: '1',
                step: '0.1',
                className: 'slider-input'
            }) as HTMLInputElement

            let initialOpacity = 0.8
            const firstLayerId = groups[base][0]
            if (firstLayerId) {
                const layer = this.map!.getLayer(firstLayerId)
                if (layer) {
                    const paintKey = `${layer.type}-opacity`
                    const currentValue = this.map!.getPaintProperty(firstLayerId, paintKey)
                    if (typeof currentValue === 'number' && !Number.isNaN(currentValue)) {
                        initialOpacity = currentValue
                    }
                }
            }
            slider.value = `${initialOpacity}`

            const handleWidth = 32
            const updateOpacity = () => {
                const v = Number(slider.value)
                const pct = Math.round(v * 100)
                percentage.textContent = `${pct}%`

                // Position handle and fill based on value
                const trackWidth = sliderTrack.offsetWidth || 150
                const maxOffset = trackWidth - handleWidth
                const handlePos = v * maxOffset
                sliderHandle.style.left = `${handlePos}px`
                sliderFill.style.width = `${handlePos}px`

                groups[base].forEach(id => {
                    const layer = this.map!.getLayer(id)
                    if (!layer) return

                    this.map!.setPaintProperty(id, `${layer.type}-opacity`, v)

                    if (layer.type === 'circle') {
                        this.map!.setPaintProperty(id, 'circle-stroke-opacity', v)
                    }
                })
            }

            slider.oninput = updateOpacity
            sliderContainer.appendChild(sliderTrack)
            sliderContainer.appendChild(slider)

            container.appendChild(sliderContainer)
            this.layerControlsContainer!.appendChild(container)
            updateOpacity()
        })
    }
}
