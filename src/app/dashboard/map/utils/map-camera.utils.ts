import type { CameraForBoundsOptions, LngLat, LngLatBoundsLike, Map, PaddingOptions } from 'maplibre-gl'
import { LngLatBounds } from 'maplibre-gl'

type FitOptions = CameraForBoundsOptions & { padding: PaddingOptions }

export class MapCameraUtils {
    // Camera for flyTo / easeTo that fits the bounds within the padding (the map area not covered by UI)
    static fitCamera(
        map: Map,
        bounds: LngLatBoundsLike,
        options: FitOptions
    ): { center: LngLat; zoom: number; padding: PaddingOptions } | undefined {
        // cameraForBounds also counts the map's current padding, so clear it while measuring
        const currentPadding = map.getPadding()
        map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 })
        const zoom = map.cameraForBounds(bounds, options)?.zoom
        map.setPadding(currentPadding)
        if (zoom === undefined) return undefined
        // flyTo applies the padding itself, so aim at the bounds' middle rather than the fit's pre-shifted centre
        return { center: LngLatBounds.convert(bounds).getCenter(), zoom, padding: options.padding }
    }
}
