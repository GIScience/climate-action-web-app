import {ComponentFixture, TestBed} from '@angular/core/testing'
import {ReportComponent} from './report.component'
import {ReportService} from './report.service'
import {HttpClientModule} from '@angular/common/http'

describe('ReportComponent', () => {
    let component: ReportComponent
    let fixture: ComponentFixture<ReportComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                ReportComponent
            ],
            providers: [ReportService],
            declarations: []
        })

        fixture = TestBed.createComponent(ReportComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should create a link and trigger a download when downloadContent is called', () => {
        const fakeAnchor = document.createElement('a')
        spyOn(fakeAnchor, 'click')
        const createElementSpy = spyOn(document, 'createElement').and.returnValue(fakeAnchor)
        const appendChildSpy = spyOn(document.body, 'appendChild').and.callFake((node) => node)
        const removeChildSpy = spyOn(document.body, 'removeChild').and.callFake((node) => node)
        component.currentUrl = 'http://localhost:4200/dashboard/sample-image.png'
        component.downloadContent()

        expect(createElementSpy).toHaveBeenCalled()
        expect(createElementSpy).toHaveBeenCalledWith('a')
        expect(fakeAnchor.href).toBe('http://localhost:4200/dashboard/sample-image.png')
        expect(fakeAnchor.download).toBeTruthy()
        expect(fakeAnchor.click).toHaveBeenCalled()
        expect(appendChildSpy).toHaveBeenCalled()
        expect(removeChildSpy).toHaveBeenCalled()
    })
})
