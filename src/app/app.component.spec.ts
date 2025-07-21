import { HttpClientModule } from '@angular/common/http'
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { AppComponent } from './app.component'
import { ArtifactViewerService } from './dashboard/artifact-viewer/artifact-viewer.service'
import { MapService } from './dashboard/map/map.service'
import { ReportService } from './dashboard/report/report.service'

jest.mock(
    'src/environments/environment',
    () => ({
        environment: {
            production: false,
            environmentType: 'testing',
            climateActionApiUrl: 'http://mock-api-url',
            climateActionWSUrl: 'ws://mock-ws-url',
            orsAPIKey: 'mock-ors-api-key',
            appwriteProjectId: 'mock-appwrite-project-id',
            appwriteEndpoint: 'mock-appwrite-endpoint',
            appwriteWebsiteUrl: 'mock-appwrite-website-url'
        }
    }),
    { virtual: true }
)

jest.mock(
    '../../package.json',
    () => ({
        default: {
            version: '2.1.0'
        }
    }),
    { virtual: true }
)

const mockArtifactViewerService = {
    closeArtifactViewer: jest.fn()
}

const mockMapService = {
    removeFocusedLayer: jest.fn(),
    removeComputeLayers: jest.fn()
}

const mockReportService = {
    closeReport: jest.fn(),
    collapseLeftColumn: jest.fn()
}

describe('AppComponent', () => {
    let component: AppComponent
    let fixture: ComponentFixture<AppComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HttpClientModule, RouterTestingModule, AppComponent],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: [
                { provide: ArtifactViewerService, useValue: mockArtifactViewerService },
                { provide: MapService, useValue: mockMapService },
                { provide: ReportService, useValue: mockReportService }
            ]
        }).compileComponents()

        fixture = TestBed.createComponent(AppComponent)
        component = fixture.componentInstance

        component.currentYear = jest.fn().mockReturnValue(2023)

        fixture.detectChanges()
    })

    it('should create the app', () => {
        expect(component).toBeTruthy()
    })

    it('should have as title "Climate Action Navigator"', () => {
        expect(component.title).toEqual('Climate Action Navigator')
    })
})
