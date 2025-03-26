import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { RouterModule } from '@angular/router'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { Feature } from 'ol'
import GeoJSON from 'ol/format/GeoJSON'
import { MultiPolygon } from 'ol/geom'
import { BehaviorSubject, of } from 'rxjs'
import { ArtifactService } from '../artifact/artifact.service'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { ComputationEntity } from './computation.interface'
import { ComputationsIndexComponent } from './computations-index.component'

describe('ComputationsIndexComponent', () => {
    let component: ComputationsIndexComponent
    let fixture: ComponentFixture<ComputationsIndexComponent>

    let mockPluginService: Partial<PluginService>
    let mockArtifactService: Partial<ArtifactService>
    let mockMapService: Partial<MapService>

    let pluginRuns$: BehaviorSubject<ComputationEntity[]>

    beforeEach(async () => {
        pluginRuns$ = new BehaviorSubject<ComputationEntity[]>([])

        mockPluginService = {
            getComputesFromLS: jest.fn(),
            updateRunStatus: jest.fn(),
            getComputationMetadata: jest.fn(),
            getPluginRuns: jest.fn(),
            setComputeState: jest.fn(),
            getComputationState: jest.fn(),
            collapsePluginCatalog: jest.fn(),
            syncTasks$: new BehaviorSubject<void>(undefined)
        }

        mockArtifactService = {
            getImage: jest.fn()
        }
        mockMapService = {
            initMap: jest.fn(),
            highlightAoI: jest.fn(),
            removeFocusedLayer: jest.fn()
        }

        mockMapService.highlightAoI = jest.fn().mockReturnValue([0, 0, 1, 1])

        await TestBed.configureTestingModule({
            imports: [
                ComputationsIndexComponent,
                HttpClientTestingModule,
                NoopAnimationsModule,
                RouterModule.forRoot([])
            ],
            providers: [
                { provide: PluginService, useValue: mockPluginService },
                { provide: ArtifactService, useValue: mockArtifactService },
                { provide: MapService, useValue: mockMapService },
                provideTippyLoader(() => import('tippy.js')),
                provideTippyConfig({
                    defaultVariation: 'tooltip',
                    variations: {
                        tooltip: tooltipVariation,
                        popper: popperVariation
                    }
                })
            ]
        }).compileComponents()

        mockPluginService.getPluginRuns = jest.fn().mockReturnValue(pluginRuns$.asObservable())
    })

    beforeEach(fakeAsync(() => {
        mockPluginService.getComputesFromLS = jest.fn().mockReturnValue([])

        fixture = TestBed.createComponent(ComputationsIndexComponent)
        component = fixture.componentInstance

        component.formatTimestamp = jest.fn().mockReturnValue('Jan 1, 2023 12:00 PM')

        fixture.detectChanges()
        tick()
        discardPeriodicTasks()
    }))

    afterEach(fakeAsync(() => {
        expect(fixture.debugElement.queryAll(By.css('.computations-index')).length).toBe(1)
        tick()
        discardPeriodicTasks()
        flush()
    }))

    it('given no runs should create an empty computation index view', fakeAsync(() => {
        expect(component).toBeTruthy()
        expect(mockPluginService.updateRunStatus).not.toHaveBeenCalled()

        expect(fixture.debugElement.queryAll(By.css('.parent-computation')).length).toBe(0)
        expect(fixture.debugElement.queryAll(By.css('.child-computation')).length).toBe(0)

        discardPeriodicTasks()
    }))

    it('given a completed run should create an expandable computation', fakeAsync(() => {
        const testRun = {
            aoiName: 'Test AOI',
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'SUCCESS',
            timestamp: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationEntity

        mockPluginService.getComputesFromLS = jest.fn().mockReturnValue([testRun])

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of({
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    timestamp: new Date('2023-09-27T16:42:52+01:00'),
                    params: {},
                    aoi: new GeoJSON().readFeature({
                        type: 'Feature',
                        geometry: {
                            type: 'MultiPolygon',
                            coordinates: [
                                [
                                    [
                                        [0, 0],
                                        [1, 0],
                                        [1, 1],
                                        [0, 1],
                                        [0, 0]
                                    ]
                                ]
                            ]
                        },
                        properties: {
                            name: 'Test AOI'
                        }
                    }) as Feature<MultiPolygon>,
                    artifacts: [
                        {
                            name: 'Image',
                            modality: 'IMAGE',
                            primary: true,
                            file_path: 'test_image.png',
                            summary: 'An image.',
                            description: 'The image is under CC0 license.',
                            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                            store_id: '09c8eabf-4b73-452c-b3bc-47310a91eaa7_blueprint_image.png',
                            attachments: {}
                        }
                    ],
                    plugin_info: {
                        plugin_id: 'test_plugin',
                        plugin_version: '1.0.0'
                    },
                    status: 'SUCCESS',
                    message: ''
                })
            }
            return of()
        })

        component.ngOnInit()
        fixture.detectChanges()
        tick()

        const parentComputation = fixture.debugElement.query(By.css('.parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        fixture.detectChanges()
        tick()

        const childComputations = fixture.debugElement.queryAll(By.css('.child-computation'))
        expect(childComputations.length).toBe(1)

        expect(mockPluginService.updateRunStatus).toHaveBeenCalledWith(
            '8a897536-c4b4-4e5a-9d70-50430183ac66',
            'SUCCESS'
        )

        tick(2000)
        discardPeriodicTasks()
    }))

    it('should archive a computation and update the list', fakeAsync(() => {
        const initialRun = {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'SUCCESS',
            timestamp: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationEntity

        component.currentRuns = [initialRun]
        component.archivedComputations = []
        localStorage.setItem('plugin_runs', JSON.stringify([initialRun]))
        localStorage.setItem('archive_runs', JSON.stringify([]))

        component.archiveComputation(initialRun.correlation_uuid)

        const archivedItems = JSON.parse(localStorage.getItem('archive_runs') || '[]')
        const activeItems = JSON.parse(localStorage.getItem('plugin_runs') || '[]')
        expect(component.archivedComputations.length).toBe(1)
        expect(component.currentRuns.length).toBe(0)
        expect(archivedItems.length).toBe(1)
        expect(activeItems.length).toBe(0)

        discardPeriodicTasks()
    }))

    it('should unarchive an computation and update the list', fakeAsync(() => {
        const archivedRun = {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'SUCCESS',
            timestamp: new Date('2023-09-27T16:42:52+01:00')
        } as ComputationEntity

        component.currentRuns = []
        component.archivedComputations = [archivedRun]
        localStorage.setItem('plugin_runs', JSON.stringify([]))
        localStorage.setItem('archive_runs', JSON.stringify([archivedRun]))

        mockPluginService.getComputationMetadata = jest.fn().mockReturnValue(of())
        component.unarchiveComputation(archivedRun.correlation_uuid)

        const archivedItems = JSON.parse(localStorage.getItem('archive_runs') || '[]')
        const activeItems = JSON.parse(localStorage.getItem('plugin_runs') || '[]')
        expect(component.archivedComputations.length).toBe(0)
        expect(component.currentRuns.length).toBe(1)
        expect(archivedItems.length).toBe(0)
        expect(activeItems.length).toBe(1)

        discardPeriodicTasks()
    }))
})
