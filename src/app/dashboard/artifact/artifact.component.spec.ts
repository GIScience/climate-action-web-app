import {ComponentFixture, fakeAsync, flush, TestBed, tick, discardPeriodicTasks} from '@angular/core/testing'
import {ArtifactComponent} from './artifact.component'
import {NoopAnimationsModule} from '@angular/platform-browser/animations'
import {HttpClientModule} from '@angular/common/http'
import {ActivatedRoute, convertToParamMap} from '@angular/router'
import {PluginService} from '../plugin/plugin.service'
import {MapService} from '../map/map.service'
import {ReportService} from '../report/report.service'
import {BehaviorSubject, of} from 'rxjs'
import {PluginRun} from '../plugin/plugin.interface'
import {ArtifactMetadata} from './artifact.interface'
import {By} from '@angular/platform-browser'
import {provideTippyLoader, provideTippyConfig, tooltipVariation, popperVariation} from '@ngneat/helipopper/config'

describe('ArtifactComponent', () => {
    let component: ArtifactComponent
    let fixture: ComponentFixture<ArtifactComponent>

    let mockPluginService: jasmine.SpyObj<PluginService>
    let mockReportService: jasmine.SpyObj<ReportService>
    let mockMapService: jasmine.SpyObj<MapService>

    let pluginRuns$: BehaviorSubject<PluginRun[]>

    beforeEach(async () => {
        pluginRuns$ = new BehaviorSubject<PluginRun[]>([])

        mockPluginService = jasmine.createSpyObj<PluginService>('PluginService', [
            'getComputesFromLS', 
            'updateRunStatus', 
            'getArtifactsMetadata', 
            'getComputesFromLS', 
            'getPluginRuns', 
            'closePluginCatalog', 
            'setPluginState',
            'getComputationState'
        ], {
            syncTasks$: new BehaviorSubject<void>(undefined)
        })

        mockReportService = jasmine.createSpyObj<ReportService>('ReportService', ['getImage', 'closeReport'])
        mockMapService = jasmine.createSpyObj<MapService>('MapService', ['initMap'])

        await TestBed.configureTestingModule({
            imports: [
                ArtifactComponent,
                NoopAnimationsModule,
                HttpClientModule
            ],
            providers: [
                {provide: PluginService, useValue: mockPluginService},
                {provide: ReportService, useValue: mockReportService},
                {provide: MapService, useValue: mockMapService},
                {provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({name: 'test_plugin'})),
                        params: of({name: 'test_plugin'})
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

        mockPluginService.getPluginRuns.and.returnValue(pluginRuns$.asObservable())
    })

    beforeEach(fakeAsync(() => {
        mockPluginService.getComputesFromLS.and.returnValue([])

        fixture = TestBed.createComponent(ArtifactComponent)
        component = fixture.componentInstance

        fixture.detectChanges()
        tick()
        discardPeriodicTasks()
    }))

    afterEach(fakeAsync(() => {
        expect(fixture.debugElement.queryAll(By.css('.artifact-tree-content')).length).toBe(1)
        tick()
        discardPeriodicTasks()
        flush()
    }))

    it('given no runs should create an empty artifact tree view', fakeAsync(() => {
        expect(component).toBeTruthy()
        expect(mockPluginService.updateRunStatus).not.toHaveBeenCalled()

        expect(fixture.debugElement.queryAll(By.css('.artifact-parent-computation')).length).toBe(0)
        expect(fixture.debugElement.queryAll(By.css('.artifact-child-computation')).length).toBe(0)

        discardPeriodicTasks()
    }))

    it('given a completed run should create an expandable tree', fakeAsync(() => {
        mockPluginService.getComputesFromLS.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'SUCCESS',
                'timestamp': new Date('2023-09-27T16:42:52+01:00')
            }
        ] as PluginRun[])

        mockPluginService.getArtifactsMetadata.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of({
            'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
            'timestamp': new Date('2023-09-27T16:42:52+01:00'),
            'params': {},
            'plugin_info': {
                'name': 'Test Plugin',
                'plugin_id': 'test_plugin'
            },
            'artifacts': [
                {
                    'name': 'Image',
                    'modality': 'IMAGE',
                    'file_path': 'test_image.png',
                    'summary': 'An image.',
                    'description': 'The image is under CC0 license.',
                    'store_id': '09c8eabf-4b73-452c-b3bc-47310a91eaa7_blueprint_image.png',
                    'primary': true
                }
            ]
        } as ArtifactMetadata))

        component.ngOnInit()
        fixture.detectChanges()
        tick()

        const parentComputation = fixture.debugElement.query(By.css('.artifact-parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        fixture.detectChanges()
        tick()

        const childComputations = fixture.debugElement.queryAll(By.css('.artifact-child-computation'))
        expect(childComputations.length).toBe(1)

        expect(mockPluginService.updateRunStatus).toHaveBeenCalledWith('8a897536-c4b4-4e5a-9d70-50430183ac66', 'SUCCESS')

        tick(2000)
        discardPeriodicTasks()
    }))

    it('should archive an artifact and update the list', fakeAsync(() => {
        const initialRun = {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'SUCCESS',
            timestamp: new Date('2023-09-27T16:42:52+01:00')
        } as PluginRun
    
        component.currentRuns = [initialRun]
        component.archivedArtifacts = []
        localStorage.setItem('plugin_runs', JSON.stringify([initialRun]))
        localStorage.setItem('archive_runs', JSON.stringify([]))
    
        component.archiveArtifact(initialRun.correlation_uuid)
    
        const archivedItems = JSON.parse(localStorage.getItem('archive_runs') || '[]')
        const activeItems = JSON.parse(localStorage.getItem('plugin_runs') || '[]')
        expect(component.archivedArtifacts.length).toBe(1)
        expect(component.currentRuns.length).toBe(0)
        expect(archivedItems.length).toBe(1)
        expect(activeItems.length).toBe(0)

        discardPeriodicTasks()
    }))
    
    it('should unarchive an artifact and update the list', fakeAsync(() => {
        const archivedRun = {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'SUCCESS',
            timestamp: new Date('2023-09-27T16:42:52+01:00')
        } as PluginRun
    
        component.currentRuns = []
        component.archivedArtifacts = [archivedRun]
        localStorage.setItem('plugin_runs', JSON.stringify([]))
        localStorage.setItem('archive_runs', JSON.stringify([archivedRun]))
    
        mockPluginService.getArtifactsMetadata.and.returnValue(of())
        component.unarchiveArtifact(archivedRun.correlation_uuid)
    
        const archivedItems = JSON.parse(localStorage.getItem('archive_runs') || '[]')
        const activeItems = JSON.parse(localStorage.getItem('plugin_runs') || '[]')
        expect(component.archivedArtifacts.length).toBe(0)
        expect(component.currentRuns.length).toBe(1)
        expect(archivedItems.length).toBe(0)
        expect(activeItems.length).toBe(1)

        discardPeriodicTasks()
    }))

    it('should render content for non-expandable computations correctly', fakeAsync(() => {
        mockPluginService.getComputesFromLS.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'SUCCESS',
                'timestamp': new Date('2023-09-27T16:42:52+01:00')
            }
        ] as PluginRun[])

        mockPluginService.getArtifactsMetadata.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of())
    
        component.ngOnInit()
        fixture.detectChanges()

        const parentNode = fixture.debugElement.query(By.css('.scheduled-parent-computation'))
        expect(parentNode).toBeTruthy()
        const metaElements = fixture.debugElement.queryAll(By.css('.card-subtitle.m-0'))
        expect(metaElements).toBeTruthy()

        discardPeriodicTasks()
    }))

    it('should display only primary children initially', fakeAsync(() => {
        mockPluginService.getComputesFromLS.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'SUCCESS',
                'timestamp': new Date('2023-09-27T16:42:52+01:00')
            }
        ] as PluginRun[])
    
        mockPluginService.getArtifactsMetadata.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of({
            'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
            'timestamp': new Date('2023-09-27T16:42:52+01:00'),
            'params': {},
            'plugin_info': {
                'name': 'Test Plugin',
                'plugin_id': 'test_plugin'
            },
            'artifacts': [
                {
                    'name': 'Image 1',
                    'modality': 'IMAGE',
                    'file_path': 'test_image1.png',
                    'summary': 'An image 1.',
                    'description': 'The image 1 is under CC0 license.',
                    'store_id': 'image1',
                    'primary': true
                },
                {
                    'name': 'Image 2',
                    'modality': 'IMAGE',
                    'file_path': 'test_image2.png',
                    'summary': 'An image 2.',
                    'description': 'The image 2 is under CC0 license.',
                    'store_id': 'image2',
                    'primary': false
                }
            ]
        } as ArtifactMetadata))

        component.ngOnInit()
        fixture.detectChanges()
    
        const parentComputation = fixture.debugElement.query(By.css('.artifact-parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()
    
        const childComputations = fixture.debugElement.queryAll(By.css('.artifact-child-computation'))
        expect(childComputations.length).toBe(1)
        expect(childComputations[0].nativeElement.textContent).toContain('Image 1')
    
        const showMoreButton = fixture.debugElement.query(By.css('.show-more'))
        expect(showMoreButton).toBeTruthy()
    }))
    
    it('should display non-primary children when Show More is clicked', fakeAsync(() => {
        mockPluginService.getComputesFromLS.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'SUCCESS',
                'timestamp': new Date('2023-09-27T16:42:52+01:00')
            }
        ] as PluginRun[])
    
        mockPluginService.getArtifactsMetadata.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of({
            'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
            'timestamp': new Date('2023-09-27T16:42:52+01:00'),
            'params': {},
            'plugin_info': {
                'name': 'Test Plugin',
                'plugin_id': 'test_plugin'
            },
            'artifacts': [
                {
                    'name': 'Image 1',
                    'modality': 'IMAGE',
                    'file_path': 'test_image1.png',
                    'summary': 'An image 1.',
                    'description': 'The image 1 is under CC0 license.',
                    'store_id': 'image1',
                    'primary': true
                },
                {
                    'name': 'Image 2',
                    'modality': 'IMAGE',
                    'file_path': 'test_image2.png',
                    'summary': 'An image 2.',
                    'description': 'The image 2 is under CC0 license.',
                    'store_id': 'image2',
                    'primary': false
                }
            ]
        } as ArtifactMetadata))
    
        component.ngOnInit()
        fixture.detectChanges()
    
        const parentComputation = fixture.debugElement.query(By.css('.artifact-parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()
    
        let childComputations = fixture.debugElement.queryAll(By.css('.artifact-child-computation'))
        expect(childComputations.length).toBe(1)
        expect(childComputations[0].nativeElement.textContent).toContain('Image 1')
    
        const showMoreButton = fixture.debugElement.query(By.css('.show-more'))
        expect(showMoreButton).toBeTruthy()
        showMoreButton.triggerEventHandler('click', null)
        tick(300)
        fixture.detectChanges()
    
        childComputations = fixture.debugElement.queryAll(By.css('.artifact-child-computation'))
        expect(childComputations.length).toBe(2)
        expect(childComputations[1].nativeElement.textContent).toContain('Image 2')
        discardPeriodicTasks()
    }))

    it('should hide non-primary children when Show Less is clicked', fakeAsync(() => {
        mockPluginService.getComputesFromLS.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'SUCCESS',
                'timestamp': new Date('2023-09-27T16:42:52+01:00')
            }
        ] as PluginRun[])
    
        mockPluginService.getArtifactsMetadata.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of({
            'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
            'timestamp': new Date('2023-09-27T16:42:52+01:00'),
            'params': {},
            'plugin_info': {
                'name': 'Test Plugin',
                'plugin_id': 'test_plugin'
            },
            'artifacts': [
                {
                    'name': 'Image 1',
                    'modality': 'IMAGE',
                    'file_path': 'test_image1.png',
                    'summary': 'An image 1.',
                    'description': 'The image 1 is under CC0 license.',
                    'store_id': 'image1',
                    'primary': true
                },
                {
                    'name': 'Image 2',
                    'modality': 'IMAGE',
                    'file_path': 'test_image2.png',
                    'summary': 'An image 2.',
                    'description': 'The image 2 is under CC0 license.',
                    'store_id': 'image2',
                    'primary': false
                }
            ]
        } as ArtifactMetadata))
    
        component.ngOnInit()
        fixture.detectChanges()
    
        const parentComputation = fixture.debugElement.query(By.css('.artifact-parent-computation'))
        expect(parentComputation).toBeTruthy()
        parentComputation.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()
    
        let childComputations = fixture.debugElement.queryAll(By.css('.artifact-child-computation'))
        expect(childComputations.length).toBe(1)
        expect(childComputations[0].nativeElement.textContent).toContain('Image 1')
    
        const showMoreButton = fixture.debugElement.query(By.css('.show-more'))
        expect(showMoreButton).toBeTruthy()
        showMoreButton.triggerEventHandler('click', null)
        tick(300)
        fixture.detectChanges()
    
        childComputations = fixture.debugElement.queryAll(By.css('.artifact-child-computation'))
        expect(childComputations.length).toBe(2)
        expect(childComputations[1].nativeElement.textContent).toContain('Image 2')
    
        const showLessButton = fixture.debugElement.query(By.css('.show-less'))
        expect(showLessButton).toBeTruthy()
        showLessButton.triggerEventHandler('click', null)
        tick(300)
        fixture.detectChanges()
    
        childComputations = fixture.debugElement.queryAll(By.css('.artifact-child-computation'))
        expect(childComputations.length).toBe(1)
        expect(childComputations[0].nativeElement.textContent).toContain('Image 1')
    
        discardPeriodicTasks()
    }))
})
