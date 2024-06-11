import {ComponentFixture, fakeAsync, TestBed, tick, flush, discardPeriodicTasks} from '@angular/core/testing'
import {ArtifactComponent} from './artifact.component'
import {NoopAnimationsModule} from '@angular/platform-browser/animations'
import {HttpClientModule} from '@angular/common/http'
import {PluginService} from '../plugin/plugin.service'
import {ReportService} from '../report/report.service'
import {NotificationService} from '../notification/notification.service'
import {of, Subject} from 'rxjs'
import {PluginRun} from '../plugin/plugin.interface'
import {Artifact} from './artifact.interface'
import {By} from '@angular/platform-browser'
import {WSMessage} from '../notification/notification.interface'

describe('ArtifactComponent', () => {
    let component: ArtifactComponent
    let fixture: ComponentFixture<ArtifactComponent>

    let mockPluginService: jasmine.SpyObj<PluginService>
    let mockReportService: jasmine.SpyObj<ReportService>
    let mockNotificationService: jasmine.SpyObj<NotificationService>

    let notifications: Subject<WSMessage>

    beforeEach(async () => {
        mockPluginService = jasmine.createSpyObj<PluginService>('PluginService', ['getComputes', 'updateRunStatus', 'getArtifacts'])
        mockReportService = jasmine.createSpyObj<ReportService>('ReportService', ['getImage'])
        mockNotificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['startWebSocket'])

        await TestBed.configureTestingModule({
            imports: [
                ArtifactComponent,
                NoopAnimationsModule,
                HttpClientModule
            ],
            providers: [
                {provide: PluginService, useValue: mockPluginService},
                {provide: ReportService, useValue: mockReportService},
                {provide: NotificationService, useValue: mockNotificationService}
            ]
        }).compileComponents()
    })

    beforeEach(() => {
        notifications = new Subject<WSMessage>()
        mockNotificationService.startWebSocket.and.returnValue(notifications.asObservable())

        mockPluginService.getComputes.and.returnValue([])

        fixture = TestBed.createComponent(ArtifactComponent)
        component = fixture.componentInstance

        fixture.detectChanges()
    })

    afterEach(() => {
        expect(fixture.debugElement.queryAll(By.css('.artifact-tree-content')).length).toBe(1)
    })

    it('given no runs should create an empty artifact tree view', () => {
        expect(component).toBeTruthy()
        expect(mockPluginService.updateRunStatus).not.toHaveBeenCalled()

        expect(fixture.debugElement.queryAll(By.css('.artifact-parent-node')).length).toBe(0)
        expect(fixture.debugElement.queryAll(By.css('.artifact-child-node')).length).toBe(0)
    })

    it('given an in-progress run when no artifacts are available should create a non-expandable node', () => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'blueprint_plugin',
                'pluginName': 'Blueprint Plugin',
                'status': 'in-progress',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }
        ] as PluginRun[])

        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of([]))

        component.ngOnInit()
        fixture.detectChanges()

        const parentNode = fixture.debugElement.query(By.css('.artifact-parent-node'))
        expect(parentNode).toBeTruthy()
    })

    it('given a completed run should create an expandable tree', () => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'completed',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }
        ] as PluginRun[])

        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of([
            {
                'name': 'Image',
                'modality': 'IMAGE',
                'file_path': 'test_image.png',
                'summary': 'An image.',
                'description': 'The image is under CC0 license.',
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'store_id': '09c8eabf-4b73-452c-b3bc-47310a91eaa7_blueprint_image.png',
                'primary': true
            }
        ] as Artifact[]))

        component.ngOnInit()
        fixture.detectChanges()

        const parentNode = fixture.debugElement.query(By.css('.artifact-parent-node'))
        expect(parentNode).toBeTruthy()
        parentNode.triggerEventHandler('click', null)
        fixture.detectChanges()

        const childNodes = fixture.debugElement.queryAll(By.css('.artifact-child-node'))
        expect(childNodes.length).toBe(1)

        expect(mockPluginService.updateRunStatus).toHaveBeenCalledWith('8a897536-c4b4-4e5a-9d70-50430183ac66', 'completed')
    })

    it('given an in-progress run when acquired computation status run should expand the tree', fakeAsync(() => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'completed',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }
        ] as PluginRun[])

        const artifact_observable = of([{
            'name': 'Image',
            'modality': 'IMAGE',
            'file_path': 'test_image.png',
            'summary': 'An image.',
            'description': 'The image is under CC0 license.',
            'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
            'store_id': '09c8eabf-4b73-452c-b3bc-47310a91eaa7_blueprint_image.png',
            'primary': true
        }] as Artifact[])

        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66')
            .and.returnValues(of([]), artifact_observable, artifact_observable)

        component.ngOnInit()
        fixture.detectChanges()

        let parentNode = fixture.debugElement.query(By.css('.artifact-parent-node'))
        parentNode.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()

        let childNodes = fixture.debugElement.queryAll(By.css('.artifact-child-node'))
        expect(childNodes.length).toBe(0)

        notifications.next({
            'type': 'computation_status',
            'status': 'completed',
            'timestamp': '2023-09-27T16:42:52+01:00',
            'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66'
        } as WSMessage)

        fixture.detectChanges()
        tick()

        parentNode = fixture.debugElement.query(By.css('.artifact-parent-node'))
        parentNode.triggerEventHandler('click', null)
        fixture.detectChanges()
        flush()

        childNodes = fixture.debugElement.queryAll(By.css('.artifact-child-node'))
        expect(childNodes.length).toBe(1)

        expect(mockPluginService.updateRunStatus).toHaveBeenCalledWith('8a897536-c4b4-4e5a-9d70-50430183ac66', 'completed')
    }))

    it('should archive an artifact and update the list', () => {
        const initialRun = {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'completed',
            timestamp: '2023-09-27T16:42:52+01:00'
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
    })
    
    it('should unarchive an artifact and update the list', () => {
        const archivedRun = {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            pluginId: 'test_plugin',
            pluginName: 'Test Plugin',
            status: 'completed',
            timestamp: '2023-09-27T16:42:52+01:00'
        } as PluginRun
    
        component.currentRuns = []
        component.archivedArtifacts = [archivedRun]
        localStorage.setItem('plugin_runs', JSON.stringify([]))
        localStorage.setItem('archive_runs', JSON.stringify([archivedRun]))
    
        mockPluginService.getArtifacts.and.returnValue(of([]))
        component.unarchiveArtifact(archivedRun.correlation_uuid)
    
        const archivedItems = JSON.parse(localStorage.getItem('archive_runs') || '[]')
        const activeItems = JSON.parse(localStorage.getItem('plugin_runs') || '[]')
        expect(component.archivedArtifacts.length).toBe(0)
        expect(component.currentRuns.length).toBe(1)
        expect(archivedItems.length).toBe(0)
        expect(activeItems.length).toBe(1)
    })

    it('should render content for non-expandable nodes correctly', () => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'blueprint_plugin',
                'pluginName': 'Blueprint Plugin',
                'status': 'in-progress',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }
        ] as PluginRun[])

        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of([]))
    
        component.ngOnInit()
        fixture.detectChanges()

        const parentNode = fixture.debugElement.query(By.css('.artifact-parent-node'))
        expect(parentNode).toBeTruthy()
        const nameElement = parentNode.query(By.css('h3'))
        const metaElements = fixture.debugElement.queryAll(By.css('.card-subtitle.m-0'))
        const metaElement = metaElements[1]
    
        expect(nameElement.nativeElement.textContent).toContain('Blueprint Plugin')
        expect(metaElement.nativeElement.textContent).toContain('8a897536-c4b4-4e5a-9d70-50430183ac66')
    })

    it('should display only primary children initially', fakeAsync(() => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'completed',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }
        ] as PluginRun[])
    
        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of([
            {
                'name': 'Image 1',
                'modality': 'IMAGE',
                'file_path': 'test_image1.png',
                'summary': 'An image 1.',
                'description': 'The image 1 is under CC0 license.',
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'store_id': 'image1',
                'primary': true
            },
            {
                'name': 'Image 2',
                'modality': 'IMAGE',
                'file_path': 'test_image2.png',
                'summary': 'An image 2.',
                'description': 'The image 2 is under CC0 license.',
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'store_id': 'image2',
                'primary': false
            }
        ] as Artifact[]))
    
        component.ngOnInit()
        fixture.detectChanges()
    
        const parentNode = fixture.debugElement.query(By.css('.artifact-parent-node'))
        expect(parentNode).toBeTruthy()
        parentNode.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()
    
        const childNodes = fixture.debugElement.queryAll(By.css('.artifact-child-node'))
        expect(childNodes.length).toBe(1)
        expect(childNodes[0].nativeElement.textContent).toContain('Image 1')
    
        const showMoreButton = fixture.debugElement.query(By.css('.show-more'))
        expect(showMoreButton).toBeTruthy()
    }))
    
    it('should display non-primary children when Show More is clicked', fakeAsync(() => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'completed',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }
        ] as PluginRun[])
    
        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of([
            {
                'name': 'Image 1',
                'modality': 'IMAGE',
                'file_path': 'test_image1.png',
                'summary': 'An image 1.',
                'description': 'The image 1 is under CC0 license.',
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'store_id': 'image1',
                'primary': true
            },
            {
                'name': 'Image 2',
                'modality': 'IMAGE',
                'file_path': 'test_image2.png',
                'summary': 'An image 2.',
                'description': 'The image 2 is under CC0 license.',
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'store_id': 'image2',
                'primary': false
            }
        ] as Artifact[]))
    
        component.ngOnInit()
        fixture.detectChanges()
    
        const parentNode = fixture.debugElement.query(By.css('.artifact-parent-node'))
        expect(parentNode).toBeTruthy()
        parentNode.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()
    
        let childNodes = fixture.debugElement.queryAll(By.css('.artifact-child-node'))
        expect(childNodes.length).toBe(1)
        expect(childNodes[0].nativeElement.textContent).toContain('Image 1')
    
        const showMoreButton = fixture.debugElement.query(By.css('.show-more'))
        expect(showMoreButton).toBeTruthy()
        showMoreButton.triggerEventHandler('click', null)
        tick(300)
        fixture.detectChanges()
    
        childNodes = fixture.debugElement.queryAll(By.css('.artifact-child-node'))
        expect(childNodes.length).toBe(2)
        expect(childNodes[1].nativeElement.textContent).toContain('Image 2')
        discardPeriodicTasks()
    }))

    it('should hide non-primary children when Show Less is clicked', fakeAsync(() => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'completed',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }
        ] as PluginRun[])
    
        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of([
            {
                'name': 'Image 1',
                'modality': 'IMAGE',
                'file_path': 'test_image1.png',
                'summary': 'An image 1.',
                'description': 'The image 1 is under CC0 license.',
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'store_id': 'image1',
                'primary': true
            },
            {
                'name': 'Image 2',
                'modality': 'IMAGE',
                'file_path': 'test_image2.png',
                'summary': 'An image 2.',
                'description': 'The image 2 is under CC0 license.',
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'store_id': 'image2',
                'primary': false
            }
        ] as Artifact[]))
    
        component.ngOnInit()
        fixture.detectChanges()
    
        const parentNode = fixture.debugElement.query(By.css('.artifact-parent-node'))
        expect(parentNode).toBeTruthy()
        parentNode.triggerEventHandler('click', null)
        tick()
        fixture.detectChanges()
    
        let childNodes = fixture.debugElement.queryAll(By.css('.artifact-child-node'))
        expect(childNodes.length).toBe(1)
        expect(childNodes[0].nativeElement.textContent).toContain('Image 1')
    
        const showMoreButton = fixture.debugElement.query(By.css('.show-more'))
        expect(showMoreButton).toBeTruthy()
        showMoreButton.triggerEventHandler('click', null)
        tick(300)
        fixture.detectChanges()
    
        childNodes = fixture.debugElement.queryAll(By.css('.artifact-child-node'))
        expect(childNodes.length).toBe(2)
        expect(childNodes[1].nativeElement.textContent).toContain('Image 2')
    
        const showLessButton = fixture.debugElement.query(By.css('.show-less'))
        expect(showLessButton).toBeTruthy()
        showLessButton.triggerEventHandler('click', null)
        tick(300)
        fixture.detectChanges()
    
        childNodes = fixture.debugElement.queryAll(By.css('.artifact-child-node'))
        expect(childNodes.length).toBe(1)
        expect(childNodes[0].nativeElement.textContent).toContain('Image 1')
    
        discardPeriodicTasks()
    }))

    it('should display the archive button on hover even if the status is failed', fakeAsync(() => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'failed',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }
        ] as PluginRun[])
    
        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of([]))
    
        component.ngOnInit()
        fixture.detectChanges()
    
        const parentNode = fixture.debugElement.query(By.css('.artifact-parent-node'))
        expect(parentNode).toBeTruthy()
    
        parentNode.triggerEventHandler('mouseenter', null)
        tick()
        fixture.detectChanges()
    
        flush()
        fixture.detectChanges()
    
        const archiveButton = parentNode.query(By.css('button.archive-artifact'))
        expect(archiveButton).toBeTruthy()
        discardPeriodicTasks()
    }))
})
