import { HttpClientTestingModule } from '@angular/common/http/testing'
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { ToastrService } from 'ngx-toastr'
import { getTranslocoTestingModule, MockToastrService } from '../testing/test-helpers'
import { AppComponent } from './app.component'
import { ArtifactViewerService } from './dashboard/artifact-viewer/artifact-viewer.service'
import { MapService } from './dashboard/map/map.service'
import { ReportService } from './dashboard/report/report.service'
import { RunSyncService, SyncState } from './persistence/run-sync.service'

const mockArtifactViewerService = {
    closeArtifactViewer: vi.fn()
}

const mockMapService = {
    removeFocusedLayer: vi.fn(),
    removeComputeLayers: vi.fn()
}

const mockReportService = {
    closeReport: vi.fn(),
    collapseLeftColumn: vi.fn()
}

describe('AppComponent', () => {
    let component: AppComponent
    let fixture: ComponentFixture<AppComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, RouterTestingModule, AppComponent, getTranslocoTestingModule()],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: [
                { provide: ArtifactViewerService, useValue: mockArtifactViewerService },
                { provide: MapService, useValue: mockMapService },
                { provide: ReportService, useValue: mockReportService },
                { provide: ToastrService, useClass: MockToastrService },
                {
                    provide: RunSyncService,
                    useValue: {
                        syncState: signal<SyncState>('idle'),
                        retrySync: vi.fn(),
                        scheduleDrain: vi.fn(),
                        commit: vi.fn().mockResolvedValue(undefined),
                        drainNow: vi.fn().mockResolvedValue(undefined)
                    }
                }
            ]
        }).compileComponents()

        fixture = TestBed.createComponent(AppComponent)
        component = fixture.componentInstance

        component.currentYear = vi.fn().mockReturnValue(2023)

        fixture.detectChanges()
    })

    it('should create the app', () => {
        expect(component).toBeTruthy()
    })

    it('should have as title "Climate Action Navigator"', () => {
        expect(component.title).toEqual('Climate Action Navigator')
    })
})
