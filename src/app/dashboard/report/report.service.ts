import { HttpClient } from '@angular/common/http'
import { Injectable, Injector, Optional } from '@angular/core'
import { ToastrService } from 'ngx-toastr'
import { BehaviorSubject } from 'rxjs'
import { StorageService } from '../../storage.service'
import { ArtifactViewerService } from '../artifact-viewer/artifact-viewer.service'
import { ArtifactEntity } from '../artifact/artifact.interface'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationBasicInfo } from '../computations-index/computation.interface'
import { MAP_ID, MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
@Injectable({
    providedIn: 'root'
})
export class ReportService {
    private artifacts: { artifact: ArtifactEntity; service: ArtifactService }[] = []
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
        private toastr: ToastrService
    ) {}

    addArtifact(artifact: ArtifactEntity, computationBasicInfo: ComputationBasicInfo) {
        const artifactInstance = JSON.parse(JSON.stringify(artifact))
        const existingIndex = this.artifacts.findIndex(a => a.artifact.store_id === artifact.store_id)

        if (existingIndex >= 0) {
            this.toastr.warning('This artifact is already in the report.', '', {
                timeOut: 4000
            })
            return
        } else if (this.artifacts.length >= this.MAX_ARTIFACTS) {
            this.toastr.warning(
                'Maximum of 4 artifacts allowed in the report. Please remove an existing artifact first.',
                '',
                {
                    timeOut: 4000
                }
            )
            return
        }

        const artifactViewerService = this.injector.get(ArtifactViewerService)
        artifactViewerService.closeArtifactViewer()

        const service = new ArtifactService(this.http)
        this.artifacts.push({
            artifact: artifactInstance,
            service: service
        })
        this.artifactsSubject.next(this.artifacts.map(a => a.artifact))

        if (this.isMapArtifact(artifactInstance)) {
            setTimeout(() => {
                const mapId = `report-map-${artifactInstance.store_id}`

                const injector = Injector.create({
                    providers: [
                        { provide: MAP_ID, useValue: mapId },
                        {
                            provide: MapService,
                            deps: [PluginService, HttpClient, StorageService, [new Optional(), MAP_ID]]
                        }
                    ],
                    parent: this.injector
                })

                const mapService = injector.get(MapService)
                const mapElement = document.getElementById(mapId)
                if (mapElement) {
                    mapService.initMap(mapId, true)

                    if (computationBasicInfo.geometry) {
                        const extent = mapService.highlightAoI(computationBasicInfo.geometry)

                        if (extent && mapService.map) {
                            mapService.map.getView().fit(extent, {
                                padding: [25, 25, 25, 25]
                            })
                            const minZoom = mapService.map.getView().getZoom()
                            if (minZoom) {
                                mapService.map.getView().setMinZoom(minZoom)
                            }
                        }
                    }

                    if (artifactInstance.modality === 'MAP_LAYER_GEOJSON') {
                        service.getGeoJson(artifactInstance)
                        service.geojson.subscribe(data => {
                            if (data) {
                                this.http.get(data.url).subscribe(geoJsonData => {
                                    mapService.addGeoJsonLayer(geoJsonData, artifactInstance.name)
                                })
                            }
                        })
                    } else if (artifactInstance.modality === 'MAP_LAYER_GEOTIFF') {
                        service.getGeoTiff(artifactInstance)
                        service.geotiff.subscribe(data => {
                            if (data) {
                                mapService.addGeoTiffLayer(data.url, artifactInstance.name)
                            }
                        })
                    }
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
