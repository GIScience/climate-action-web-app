import type { GeoTIFF as GeoTIFFClass, TypedArray } from 'geotiff'

export class MapGeoTiffUtils {
    private static readonly MAX_DIMENSION = 4096
    private static readonly MAX_PIXELS = this.MAX_DIMENSION * this.MAX_DIMENSION
    private static readonly COLOR_PALETTE_SIZE = 768
    private static readonly COLOR_MAX_VALUE = 255
    private static readonly COLOR_CONVERSION_FACTOR = 257

    static async readDownsampledGeoTiffRasters(
        tiff: GeoTIFFClass
    ): Promise<{ rasters: TypedArray | TypedArray[]; width: number; height: number }> {
        let image = await tiff.getImage()
        const originalWidth = image.getWidth()
        const originalHeight = image.getHeight()
        const scaleFactor = Math.min(
            1,
            this.MAX_DIMENSION / Math.max(originalWidth, originalHeight),
            Math.sqrt(this.MAX_PIXELS / (originalWidth * originalHeight))
        )
        if (scaleFactor >= 1)
            return { rasters: await image.readRasters(), width: originalWidth, height: originalHeight }
        const imageCount = await tiff.getImageCount()
        if (imageCount > 1) {
            const overviewLevel = Math.min(Math.floor(Math.log2(1 / scaleFactor)), imageCount - 1)
            image = await tiff.getImage(overviewLevel)
            return { rasters: await image.readRasters(), width: image.getWidth(), height: image.getHeight() }
        }
        const width = Math.floor(originalWidth * scaleFactor)
        const height = Math.floor(originalHeight * scaleFactor)
        return { rasters: await image.readRasters({ width, height, resampleMethod: 'bilinear' }), width, height }
    }

    static renderPalettedGeoTiff(
        width: number,
        height: number,
        raster: TypedArray,
        colorMap: number[],
        nodata?: number | null
    ): HTMLCanvasElement {
        const canvas = Object.assign(document.createElement('canvas'), { width, height })
        const ctx = canvas.getContext('2d')!
        const imageData = ctx.createImageData(width, height)
        if (!raster || colorMap?.length !== this.COLOR_PALETTE_SIZE) {
            console.warn('GeoTIFF is not in a supported paletted format. Returning empty canvas.')
            return canvas
        }
        for (let i = 0; i < width * height; i++) {
            const p = Math.round(raster[i])
            if (p < 0 || p >= 256) continue
            let [r, g, b] = [colorMap[p], colorMap[256 + p], colorMap[512 + p]]
            if (r > this.COLOR_MAX_VALUE || g > this.COLOR_MAX_VALUE || b > this.COLOR_MAX_VALUE) {
                r = Math.round(r / this.COLOR_CONVERSION_FACTOR)
                g = Math.round(g / this.COLOR_CONVERSION_FACTOR)
                b = Math.round(b / this.COLOR_CONVERSION_FACTOR)
            }
            // Treat as transparent: (1) nodata pixels (from file metadata, defaulting to 0),
            // or (2) black RGB output - matching OpenLayers' nodata:0 with convertToRGB:true
            const isNoDataByValue = nodata === null || nodata === undefined ? p === 0 : p === nodata
            const isTransparentBlack = r === 0 && g === 0 && b === 0
            if (isNoDataByValue || isTransparentBlack) continue
            imageData.data.set([r, g, b, 255], i * 4)
        }
        ctx.putImageData(imageData, 0, 0)
        return canvas
    }

    static getFirstRaster = (rasters: TypedArray | TypedArray[]) => (Array.isArray(rasters) ? rasters[0] : rasters)
}
