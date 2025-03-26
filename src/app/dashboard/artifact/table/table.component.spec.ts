import { HttpClient, HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { jest } from '@jest/globals'
import { of } from 'rxjs'
import { TableComponent } from './table.component'

describe('TableComponent', () => {
    let component: TableComponent
    let fixture: ComponentFixture<TableComponent>
    let httpClientSpy: jest.Mocked<HttpClient>

    beforeEach(() => {
        httpClientSpy = {
            post: jest.fn(),
            get: jest.fn()
        } as unknown as jest.Mocked<HttpClient>

        TestBed.configureTestingModule({
            imports: [TableComponent, HttpClientModule],
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpClientSpy
                }
            ]
        })
        fixture = TestBed.createComponent(TableComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should render table from csv', fakeAsync(() => {
        httpClientSpy.get.mockReturnValue(
            of(
                'Username; Identifier;First name;Last name\n' +
                    'booker12;9012;Rachel;Booker\n' +
                    'grey07;2070;Laura;Grey\n' +
                    'johnson81;4081;Craig;Johnson\n' +
                    'jenkins46;9346;Mary;Jenkins\n' +
                    'smith79;5079;Jamie;Smith\n'
            )
        )

        component.url = 'http://localhost'
        component.ngOnInit()
        fixture.detectChanges()

        tick(100)

        const expectedHeaders = ['Username', 'Identifier', 'First name', 'Last name']
        const renderedHeaders = fixture.debugElement
            .queryAll(By.css('th'))
            .map(headerElement => headerElement.nativeElement.textContent.trim())

        expect(renderedHeaders).toEqual(expectedHeaders)

        const ths = fixture.debugElement.queryAll(By.css('th'))
        expect(ths).toHaveLength(1 * 4)

        const trs = fixture.debugElement.queryAll(By.css('td'))
        expect(trs).toHaveLength(5 * 4)
    }))
})
