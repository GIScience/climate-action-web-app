import { TranslocoService } from '@jsverse/transloco'
import { IControl } from 'maplibre-gl'
import { Subscription } from 'rxjs'
import { MapStyle, MapStyleSwitcherControl } from './map-style-switcher.utils'

export class MapControlsUtils {
    private static createControlButton(options: {
        text: string
        title: string
        action: () => void
        fontSize?: string
        fontWeight?: string
    }) {
        const btn = Object.assign(document.createElement('button'), {
            className: 'maplibregl-ctrl-icon',
            type: 'button',
            title: options.title,
            innerHTML: options.text,
            onclick: options.action
        })
        Object.assign(btn.style, { fontSize: options.fontSize || '14px', fontWeight: options.fontWeight || 'normal' })
        return btn
    }

    static createZoomToZeroControl(translocoService: TranslocoService): IControl {
        let container: HTMLDivElement | undefined
        let button: HTMLButtonElement | undefined
        let subscription: Subscription | undefined
        const setButtonTitle = (title: string) => {
            if (button) {
                button.title = title
            }
        }

        return {
            onAdd: map => {
                container = Object.assign(document.createElement('div'), {
                    className: 'maplibregl-ctrl maplibregl-ctrl-group zoom-to-zero-control'
                })
                button = this.createControlButton({
                    text: '<img src="assets/images/globe.svg" />',
                    title: translocoService.translate('map.zoomToWorldView'),
                    action: () => map.easeTo({ zoom: 3, pitch: 0, bearing: 0, center: [10, 30], duration: 1000 })
                })
                container.append(button)

                subscription = translocoService.selectTranslate('map.zoomToWorldView').subscribe(setButtonTitle)

                return container
            },
            onRemove: () => {
                subscription?.unsubscribe()
                subscription = undefined
                container?.remove()
                container = undefined
                button = undefined
            },
            getDefaultPosition: () => 'top-right'
        }
    }

    static createLayerSwitcherControl(
        styles: MapStyle[],
        currentBasemapStyle: string,
        translocoService: TranslocoService,
        onStyleChange: (styleName: string) => void,
        onStateChange?: (isExpanded: boolean) => void,
        initialExpanded?: boolean
    ): MapStyleSwitcherControl {
        return new MapStyleSwitcherControl(
            styles,
            currentBasemapStyle,
            translocoService,
            onStyleChange,
            onStateChange,
            initialExpanded
        )
    }
}
