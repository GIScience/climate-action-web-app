import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, flush, tick } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { ActivatedRoute } from '@angular/router'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { BehaviorSubject, of } from 'rxjs'
import { ArtifactService } from '../artifact/artifact.service'
import { ComputationEntity, ComputationMetadata } from '../computations-index/computation.interface'
import { ComputationsIndexComponent } from '../computations-index/computations-index.component'
import { MapService } from '../map/map.service'
import { PluginService } from '../plugin/plugin.service'
import { ComputationComponent } from './computation.component'

describe('ComputationComponent', () => {
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
            initMap: jest.fn()
        }

        await TestBed.configureTestingModule({
            imports: [ComputationComponent, NoopAnimationsModule, HttpClientModule],
            providers: [
                { provide: PluginService, useValue: mockPluginService },
                { provide: ArtifactService, useValue: mockArtifactService },
                { provide: MapService, useValue: mockMapService },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            params: {
                                name: 'test_plugin'
                            }
                        },
                        queryParams: of({})
                    }
                },
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
        if (fixture) {
            expect(fixture.debugElement.queryAll(By.css('.computations-index-content')).length).toBe(1)
            tick()
            discardPeriodicTasks()
            flush()
        }
    }))

    it('should render content for non-expandable computations correctly', fakeAsync(() => {
        mockPluginService.getComputesFromLS = jest.fn().mockReturnValue([
            {
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                pluginId: 'test_plugin',
                pluginName: 'Test Plugin',
                status: 'SUCCESS',
                timestamp: new Date('2023-09-27T16:42:52+01:00')
            }
        ] as ComputationEntity[])

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of()
            }
            return of()
        })

        component.ngOnInit()
        fixture.detectChanges()

        const parentNode = fixture.debugElement.query(By.css('.scheduled-parent-computation'))
        expect(parentNode).toBeTruthy()
        const metaElements = fixture.debugElement.queryAll(By.css('.card-subtitle.m-0'))
        expect(metaElements).toBeTruthy()

        discardPeriodicTasks()
    }))

    it('should display only primary children initially', fakeAsync(() => {
        mockPluginService.getComputesFromLS = jest.fn().mockReturnValue([
            {
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                pluginId: 'test_plugin',
                pluginName: 'Test Plugin',
                status: 'SUCCESS',
                timestamp: new Date('2023-09-27T16:42:52+01:00')
            }
        ] as ComputationEntity[])

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of({
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    timestamp: new Date('2023-09-27T16:42:52+01:00'),
                    params: {},
                    plugin_info: {
                        plugin_id: 'test_plugin',
                        plugin_version: '1.0.0'
                    },
                    artifacts: [
                        {
                            name: 'Image 1',
                            modality: 'IMAGE',
                            file_path: 'test_image1.png',
                            summary: 'An image 1.',
                            description: 'The image 1 is under CC0 license.',
                            store_id: 'image1',
                            primary: true
                        },
                        {
                            name: 'Image 2',
                            modality: 'IMAGE',
                            file_path: 'test_image2.png',
                            summary: 'An image 2.',
                            description: 'The image 2 is under CC0 license.',
                            store_id: 'image2',
                            primary: false
                        }
                    ]
                } as ComputationMetadata)
            }
            return of()
        })

        component.ngOnInit()
        fixture.detectChanges()

        const parentComputation = fixture.debugElement.query(By.css('.parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()

        const childComputations = fixture.debugElement.queryAll(By.css('.child-computation'))
        expect(childComputations.length).toBe(1)
        expect(childComputations[0].nativeElement.textContent).toContain('Image 1')

        const showMoreButton = fixture.debugElement.query(By.css('.show-more'))
        expect(showMoreButton).toBeTruthy()
    }))

    it('should display non-primary children when Show More is clicked', fakeAsync(() => {
        mockPluginService.getComputesFromLS = jest.fn().mockReturnValue([
            {
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                pluginId: 'test_plugin',
                pluginName: 'Test Plugin',
                status: 'SUCCESS',
                timestamp: new Date('2023-09-27T16:42:52+01:00')
            }
        ] as ComputationEntity[])

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of({
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    timestamp: new Date('2023-09-27T16:42:52+01:00'),
                    params: {},
                    plugin_info: {
                        plugin_id: 'test_plugin',
                        plugin_version: '1.0.0'
                    },
                    artifacts: [
                        {
                            name: 'Image 1',
                            modality: 'IMAGE',
                            file_path: 'test_image1.png',
                            summary: 'An image 1.',
                            description: 'The image 1 is under CC0 license.',
                            store_id: 'image1',
                            primary: true
                        },
                        {
                            name: 'Image 2',
                            modality: 'IMAGE',
                            file_path: 'test_image2.png',
                            summary: 'An image 2.',
                            description: 'The image 2 is under CC0 license.',
                            store_id: 'image2',
                            primary: false
                        }
                    ]
                } as ComputationMetadata)
            }
            return of()
        })

        component.ngOnInit()
        fixture.detectChanges()

        const parentComputation = fixture.debugElement.query(By.css('.parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()

        let childComputations = fixture.debugElement.queryAll(By.css('.child-computation'))
        expect(childComputations.length).toBe(1)
        expect(childComputations[0].nativeElement.textContent).toContain('Image 1')

        const showMoreButton = fixture.debugElement.query(By.css('.show-more'))
        expect(showMoreButton).toBeTruthy()
        showMoreButton.triggerEventHandler('click', null)
        tick(300)
        fixture.detectChanges()

        childComputations = fixture.debugElement.queryAll(By.css('.child-computation'))
        expect(childComputations.length).toBe(2)
        expect(childComputations[1].nativeElement.textContent).toContain('Image 2')
        discardPeriodicTasks()
    }))

    it('should hide non-primary children when Show Less is clicked', fakeAsync(() => {
        mockPluginService.getComputesFromLS = jest.fn().mockReturnValue([
            {
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                pluginId: 'test_plugin',
                pluginName: 'Test Plugin',
                status: 'SUCCESS',
                timestamp: new Date('2023-09-27T16:42:52+01:00')
            }
        ] as ComputationEntity[])

        mockPluginService.getComputationMetadata = jest.fn().mockImplementation((id: string) => {
            if (id === '8a897536-c4b4-4e5a-9d70-50430183ac66') {
                return of({
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    timestamp: new Date('2023-09-27T16:42:52+01:00'),
                    params: {},
                    plugin_info: {
                        plugin_id: 'test_plugin',
                        plugin_version: '1.0.0'
                    },
                    artifacts: [
                        {
                            name: 'Image 1',
                            modality: 'IMAGE',
                            file_path: 'test_image1.png',
                            summary: 'An image 1.',
                            description: 'The image 1 is under CC0 license.',
                            store_id: 'image1',
                            primary: true
                        },
                        {
                            name: 'Image 2',
                            modality: 'IMAGE',
                            file_path: 'test_image2.png',
                            summary: 'An image 2.',
                            description: 'The image 2 is under CC0 license.',
                            store_id: 'image2',
                            primary: false
                        }
                    ]
                } as ComputationMetadata)
            }
            return of()
        })

        component.ngOnInit()
        fixture.detectChanges()

        const parentComputation = fixture.debugElement.query(By.css('.parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()

        let childComputations = fixture.debugElement.queryAll(By.css('.child-computation'))
        expect(childComputations.length).toBe(1)
        expect(childComputations[0].nativeElement.textContent).toContain('Image 1')

        const showMoreButton = fixture.debugElement.query(By.css('.show-more'))
        expect(showMoreButton).toBeTruthy()
        showMoreButton.triggerEventHandler('click', null)
        tick(300)
        fixture.detectChanges()

        childComputations = fixture.debugElement.queryAll(By.css('.child-computation'))
        expect(childComputations.length).toBe(2)
        expect(childComputations[1].nativeElement.textContent).toContain('Image 2')

        const showLessButton = fixture.debugElement.query(By.css('.show-less'))
        expect(showLessButton).toBeTruthy()
        showLessButton.triggerEventHandler('click', null)
        tick(300)
        fixture.detectChanges()

        childComputations = fixture.debugElement.queryAll(By.css('.child-computation'))
        expect(childComputations.length).toBe(1)
        expect(childComputations[0].nativeElement.textContent).toContain('Image 1')

        discardPeriodicTasks()
    }))
})
