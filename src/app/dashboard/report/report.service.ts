import { HttpClient } from '@angular/common/http'
import { Injectable, Injector } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import type { FeatureCollection } from 'geojson'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject } from 'rxjs'
import { StorageService } from '../../storage.service'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactEntity } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationBasicInfo } from '../computations-index/computation.interface'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
@Injectable({
    providedIn: 'root'
})
export class ReportService {
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

    readonly MAX_ARTIFACTS = 4

    constructor(
        private http: HttpClient,
        private injector: Injector,
        private toastr: ToastrService,
        private artifactViewerService: ArtifactViewerService,
        private translocoService: TranslocoService
    ) {}

    addArtifact(artifact: ArtifactEntity, computationBasicInfo: ComputationBasicInfo) {
        const artifactInstance = JSON.parse(JSON.stringify(artifact))
        const existingIndex = this.artifacts.findIndex(a => a.artifact.store_id === artifact.store_id)

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

        const artifactService = new ArtifactService(this.http)
        this.artifacts.push({
            artifact: artifactInstance,
            service: artifactService,
            computationInfo: computationBasicInfo
        })
        this.artifactsSubject.next(this.artifacts.map(a => a.artifact))

        if (this.isMapArtifact(artifactInstance)) {
            setTimeout(() => {
                const mapId = `report-map-${artifactInstance.store_id}`

                const injector = Injector.create({
                    providers: [
                        {
                            provide: MapService,
                            useFactory: (
                                pluginService: PluginService,
                                http: HttpClient,
                                storageService: StorageService,
                                translocoService: TranslocoService
                            ) => {
                                return new MapService(pluginService, http, storageService, translocoService)
                            },
                            deps: [PluginService, HttpClient, StorageService, TranslocoService]
                        }
                    ],
                    parent: this.injector
                })

                const mapService = injector.get(MapService)
                const mapElement = document.getElementById(mapId)
                if (mapElement) {
                    mapService.initMap(mapId, true)

                    // @ts-ignore: Store map instance globally for PDF export
                    window[`maplibre_map_${artifactInstance.store_id}`] = mapService.map

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

                                if (artifactInstance.modality === 'MAP_LAYER_GEOJSON') {
                                    artifactService.getGeoJson(artifactInstance)
                                    artifactService.geojson.subscribe(data => {
                                        if (data) {
                                            this.http.get<FeatureCollection>(data.url).subscribe(geoJsonData => {
                                                mapService.addGeoJsonLayer(geoJsonData, artifactInstance.name)
                                            })
                                        }
                                    })
                                } else if (artifactInstance.modality === 'MAP_LAYER_GEOTIFF') {
                                    artifactService.getGeoTiff(artifactInstance)
                                    artifactService.geotiff.subscribe(data => {
                                        if (data) {
                                            mapService.addGeoTiffLayer(data.url, artifactInstance.name)
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
        const index = this.artifacts.findIndex(a => a.artifact.store_id === artifact.store_id)
        if (index > -1) {
            this.artifacts.splice(index, 1)
            this.artifactsSubject.next(this.artifacts.map(a => a.artifact))
        }
    }

    getServiceForArtifact(artifact: ArtifactEntity): ArtifactService | undefined {
        return this.artifacts.find(a => a.artifact.store_id === artifact.store_id)?.service
    }

    getComputationInfoForArtifact(artifact: ArtifactEntity): ComputationBasicInfo | undefined {
        return this.artifacts.find(a => a.artifact.store_id === artifact.store_id)?.computationInfo
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
    }

    collapseLeftColumn(collapse: boolean) {
        this.collapseLeftColumnSubject.next(collapse)
    }

    isMapArtifact(artifact: ArtifactEntity): boolean {
        return artifact.modality === 'MAP_LAYER_GEOJSON' || artifact.modality === 'MAP_LAYER_GEOTIFF'
    }
}
