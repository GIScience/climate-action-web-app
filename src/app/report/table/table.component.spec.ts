import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing'
import {TableComponent} from './table.component'
import {HttpClient, HttpClientModule} from '@angular/common/http'
import {of} from 'rxjs'
import {By} from '@angular/platform-browser'
import SpyObj = jasmine.SpyObj

describe('TableComponent', () => {
    let component: TableComponent
    let fixture: ComponentFixture<TableComponent>

    let httpClientSpy: SpyObj<HttpClient>

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['post', 'get'])

        TestBed.configureTestingModule({
            imports: [
                TableComponent,
                HttpClientModule
            ],
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
        httpClientSpy.get.and.returnValue(of(
            'Username; Identifier;First name;Last name\n' +
            'booker12;9012;Rachel;Booker\n' +
            'grey07;2070;Laura;Grey\n' +
            'johnson81;4081;Craig;Johnson\n' +
            'jenkins46;9346;Mary;Jenkins\n' +
            'smith79;5079;Jamie;Smith\n'))

        component.url = 'http://localhost'
        component.ngOnInit()
        fixture.detectChanges()

        tick(100)

        const ths = fixture.debugElement.queryAll(By.css('th'))
        expect(ths).toHaveSize(1 * 4)

        const trs = fixture.debugElement.queryAll(By.css('td'))
        expect(trs).toHaveSize(5 * 4)
    }))
})
