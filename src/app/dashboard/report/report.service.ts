import { HttpClient } from '@angular/common/http'
import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import type { FeatureCollection } from 'geojson'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject, combineLatest, map } from 'rxjs'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactEntity } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationBasicInfo } from '../computations-index/computation.interface'
import { MapService } from '../map/map.service'
@Injectable({
    providedIn: 'root'
})
export class ReportService {
    private http = inject(HttpClient)
    private injector = inject(EnvironmentInjector)
    private toastr = inject(ToastrService)
    private artifactViewerService = inject(ArtifactViewerService)
    private translocoService = inject(TranslocoService)

    private artifacts: {
        artifact: ArtifactEntity
        service: ArtifactService
        computationInfo: ComputationBasicInfo
    }[] = []
    private isVisibleSubject = new BehaviorSubject<boolean>(false)
    isVisible$ = this.isVisibleSubject.asObservable()

    private artifactsSubject = new BehaviorSubject<ArtifactEntity[]>([])
    artifacts$ = this.artifactsSubject.asObservable()

    private collapseLeftColumnSubject = new BehaviorSubject<boolean>(false)
    collapseLeftColumn$ = this.collapseLeftColumnSubject.asObservable()

    private loadingArtifactsSubject = new BehaviorSubject<Set<string>>(new Set())

    isExportReady$ = combineLatest([this.artifactsSubject, this.loadingArtifactsSubject]).pipe(
        map(([artifacts, loading]) => artifacts.length > 0 && loading.size === 0)
    )

    private loadingTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

    readonly MAX_ARTIFACTS = 4
    private readonly LOADING_TIMEOUT_MS = 10_000

    addArtifact(artifact: ArtifactEntity, computationBasicInfo: ComputationBasicInfo) {
        const artifactInstance = JSON.parse(JSON.stringify(artifact))
        const existingIndex = this.artifacts.findIndex(a => a.artifact.filename === artifact.filename)

        if (existingIndex >= 0) {
            this.toastr.warning(this.translocoService.translate('report.artifactAlreadyInReport'), '', {
                timeOut: 4000
            })
            return
        } else if (this.artifacts.length >= this.MAX_ARTIFACTS) {
            this.toastr.warning(this.translocoService.translate('report.maximumArtifactsAllowed'), '', {
                timeOut: 4000
            })
            return
        }

        this.artifactViewerService.closeArtifactViewer()

        const artifactService = runInInjectionContext(this.injector, () => new ArtifactService())
        this.artifacts.push({
            artifact: artifactInstance,
            service: artifactService,
            computationInfo: computationBasicInfo
        })
        this.artifactsSubject.next(this.artifacts.map(a => a.artifact))

        if (this.isMapArtifact(artifactInstance.modality)) {
            this.markArtifactLoading(artifactInstance.filename)

            setTimeout(() => {
                const mapId = `report-map-${artifactInstance.filename}`

                const mapService = runInInjectionContext(this.injector, () => new MapService())
                const mapElement = document.getElementById(mapId)
                if (mapElement) {
                    mapService.initMap(mapId, true)

                    // @ts-ignore: Store map instance globally for PDF export
                    window[`maplibre_map_${artifactInstance.filename}`] = mapService.map

                    const markReady = () => {
                        if (mapService.map) {
                            mapService.map.once('idle', () => {
                                this.markArtifactReady(artifactInstance.filename)
                            })
                        } else {
                            this.markArtifactReady(artifactInstance.filename)
                        }
                    }

                    const waitForMapLoad = () => {
                        if (mapService.map) {
                            mapService.map.once('idle', () => {
                                if (computationBasicInfo.geometry) {
                                    const extent = mapService.highlightAoI(computationBasicInfo.geometry)

                                    if (extent && mapService.map) {
                                        mapService.fitToExtent(extent, {
                                            padding: { top: 25, right: 25, bottom: 25, left: 25 }
                                        })
                                        const minZoom = mapService.map.getZoom()
                                        if (minZoom) {
                                            mapService.map.setMinZoom(minZoom)
                                        }
                                    }
                                }

                                if (artifactInstance.modality === 'VECTOR_MAP_LAYER') {
                                    artifactService.getVector(artifactInstance)
                                    artifactService.vector.subscribe(data => {
                                        if (data) {
                                            if (data.url.endsWith('.geojson')) {
                                                this.http.get<FeatureCollection>(data.url).subscribe(geojson => {
                                                    mapService.addGeoJsonLayer(geojson, artifactInstance.name)
                                                    markReady()
                                                })
                                            } else if (data.url.endsWith('.pmtiles')) {
                                                mapService.addPmtilesLayer(data.url, artifactInstance.name)
                                                markReady()
                                            }
                                        }
                                    })
                                } else if (artifactInstance.modality === 'RASTER_MAP_LAYER') {
                                    artifactService.getRaster(artifactInstance)
                                    artifactService.raster.subscribe(data => {
                                        if (data) {
                                            mapService.addRasterLayer(data.url, artifactInstance.name)
                                            markReady()
                                        }
                                    })
                                }
                            })
                        } else {
                            setTimeout(waitForMapLoad, 50)
                        }
                    }
                    waitForMapLoad()
                }
            }, 100)
        }
        this.isVisibleSubject.next(true)
    }

    removeArtifact(artifact: ArtifactEntity) {
        const index = this.artifacts.findIndex(a => a.artifact.filename === artifact.filename)
        if (index > -1) {
            this.artifacts.splice(index, 1)
            this.artifactsSubject.next(this.artifacts.map(a => a.artifact))
            this.markArtifactReady(artifact.filename)
        }
    }

    getServiceForArtifact(artifact: ArtifactEntity): ArtifactService | undefined {
        return this.artifacts.find(a => a.artifact.filename === artifact.filename)?.service
    }

    getComputationInfoForArtifact(artifact: ArtifactEntity): ComputationBasicInfo | undefined {
        return this.artifacts.find(a => a.artifact.filename === artifact.filename)?.computationInfo
    }

    openReport() {
        this.artifactViewerService.closeArtifactViewer()
        this.isVisibleSubject.next(true)
    }

    closeReport() {
        this.artifacts = []
        this.artifactsSubject.next([])
        this.isVisibleSubject.next(false)
        this.collapseLeftColumnSubject.next(false)
        this.loadingTimeouts.forEach(timeout => clearTimeout(timeout))
        this.loadingTimeouts.clear()
        this.loadingArtifactsSubject.next(new Set())
    }

    collapseLeftColumn(collapse: boolean) {
        this.collapseLeftColumnSubject.next(collapse)
    }

    isMapArtifact(modality: ArtifactEntity['modality']): boolean {
        return modality === 'VECTOR_MAP_LAYER' || modality === 'RASTER_MAP_LAYER'
    }

    private markArtifactLoading(filename: string) {
        const current = this.loadingArtifactsSubject.value
        const next = new Set(current)
        next.add(filename)
        this.loadingArtifactsSubject.next(next)

        const timeout = setTimeout(() => {
            this.markArtifactReady(filename)
        }, this.LOADING_TIMEOUT_MS)
        this.loadingTimeouts.set(filename, timeout)
    }

    private markArtifactReady(filename: string) {
        const timeout = this.loadingTimeouts.get(filename)
        if (timeout) {
            clearTimeout(timeout)
            this.loadingTimeouts.delete(filename)
        }

        const current = this.loadingArtifactsSubject.value
        if (current.has(filename)) {
            const next = new Set(current)
            next.delete(filename)
            this.loadingArtifactsSubject.next(next)
        }
    }
}
