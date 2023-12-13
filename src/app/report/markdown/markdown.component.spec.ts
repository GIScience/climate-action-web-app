import {ComponentFixture, TestBed} from '@angular/core/testing'

import {MarkdownComponent} from './markdown.component'
import {MarkdownModule} from 'ngx-markdown'
import {By} from '@angular/platform-browser'
import {HttpClient} from '@angular/common/http'
import {of} from 'rxjs'
import SpyObj = jasmine.SpyObj

describe('MarkdownComponent', () => {

    let component: MarkdownComponent
    let fixture: ComponentFixture<MarkdownComponent>
    let httpClientSpy: SpyObj<HttpClient>

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['post', 'get'])

        TestBed.configureTestingModule({
            imports: [
                MarkdownComponent,
                MarkdownModule.forRoot()
            ],
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpClientSpy
                }
            ]
        })
        fixture = TestBed.createComponent(MarkdownComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should render markdown', () => {
        httpClientSpy.get.and.returnValue(of('**markdown**'))

        component.url = 'http://localhost'
        fixture.detectChanges()
        const markdown = fixture.debugElement.query(By.css('markdown'))

        expect(markdown.nativeElement.textContent).toEqual('markdown\n')
    })
})
