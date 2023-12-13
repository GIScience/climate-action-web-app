import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing'

import {ArtifactComponent} from './artifact.component'
import {HttpClientModule} from '@angular/common/http'
import {PluginService} from '../plugin/plugin.service'
import {ReportService} from '../report/report.service'
import {NotificationService} from '../notification/notification.service'
import {of, Subject} from 'rxjs'
import {PluginRun} from '../plugin/plugin.interface'
import {Artifact} from './artifact.interface'
import {By} from '@angular/platform-browser'
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed'
import {HarnessLoader} from '@angular/cdk/testing'
import {MatTreeHarness} from '@angular/material/tree/testing'
import {WSMessage} from '../notification/notification.interface'


describe('ArtifactsComponent', () => {
    let component: ArtifactComponent
    let fixture: ComponentFixture<ArtifactComponent>
    let loader: HarnessLoader

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

        fixture = TestBed.createComponent(ArtifactComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);

        fixture.autoDetectChanges()
    })

    afterEach(() => {
        expect(fixture.debugElement.queryAll(By.css('mat-tree')).length).toBe(1)
    })

    it('given no runs should create an empty artifact tree view', () => {
        expect(component).toBeTruthy()
        expect(mockPluginService.updateRunStatus).not.toHaveBeenCalled()

        expect(fixture.debugElement.queryAll(By.css('mat-parent-tree-node')).length).toBe(0)
        expect(fixture.debugElement.queryAll(By.css('mat-child-tree-node')).length).toBe(0)
    })

    it('given an in-progress run when no artifacts are available should create an non-expandable', async () => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'blueprint_plugin',
                'pluginName': 'Blueprint Plugin',
                'status': 'in-progress',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }] as PluginRun[])

        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of([]))

        component.ngOnInit()

        const tree = await loader.getHarness(MatTreeHarness)
        const treeDescendants = await tree.getNodes()
        expect(treeDescendants.length).toBe(1)
    })


    it('given a completed run should create an expandable tree', async () => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'completed',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }] as PluginRun[])


        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66').and.returnValue(of([
            {
                'name': 'Image',
                'modality': 'IMAGE',
                'file_path': 'test_image.png',
                'summary': 'An image.',
                'description': 'The image is under CC0 license.',
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'store_id': '09c8eabf-4b73-452c-b3bc-47310a91eaa7_blueprint_image.png'
            }
        ] as Artifact[]))

        component.ngOnInit()

        const tree = await loader.getHarness(MatTreeHarness);
        const treeDescendants = await tree.getNodes();
        expect(treeDescendants.length).toBe(1);

        await treeDescendants[0].expand();
        expect((await tree.getNodes()).length).toBe(2);

        expect(mockPluginService.updateRunStatus)
            .toHaveBeenCalledWith('8a897536-c4b4-4e5a-9d70-50430183ac66', 'completed')
    })

    it('given an in-progress run when acquired computation status run should expand the tree', fakeAsync(async () => {
        mockPluginService.getComputes.and.returnValue([
            {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'pluginId': 'test_plugin',
                'pluginName': 'Test Plugin',
                'status': 'completed',
                'timestamp': '2023-09-27T16:42:52+01:00'
            }] as PluginRun[])

        const artifact_observable = of([{
            'name': 'Image',
            'modality': 'IMAGE',
            'file_path': 'test_image.png',
            'summary': 'An image.',
            'description': 'The image is under CC0 license.',
            'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
            'store_id': '09c8eabf-4b73-452c-b3bc-47310a91eaa7_blueprint_image.png'
        }] as Artifact[])

        mockPluginService.getArtifacts.withArgs('8a897536-c4b4-4e5a-9d70-50430183ac66')
            .and.returnValues(of([]), artifact_observable, artifact_observable)

        component.ngOnInit()

        let tree = await loader.getHarness(MatTreeHarness)
        let treeDescendants = await tree.getNodes()
        expect(treeDescendants.length).toBe(1)

        await treeDescendants[0].expand();
        expect((await tree.getNodes()).length).toBe(1)

        notifications.next({
            'type': 'computation_status',
            'status': 'completed',
            'timestamp': '2023-09-27T16:42:52+01:00',
            'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66'
        } as WSMessage)

        tree = await loader.getHarness(MatTreeHarness)
        treeDescendants = await tree.getNodes()
        await treeDescendants[0].expand();
        expect((await tree.getNodes()).length).toBe(2)

        expect(mockPluginService.updateRunStatus)
            .toHaveBeenCalledWith('8a897536-c4b4-4e5a-9d70-50430183ac66', 'completed')
    }))
})
