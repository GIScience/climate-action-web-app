import {ComponentFixture, TestBed} from '@angular/core/testing'
import {RouterTestingModule} from '@angular/router/testing'
import {AppComponent} from './app.component'
import {NotificationComponent} from './notification/notification.component'
import {HttpClientModule} from '@angular/common/http'
import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core'

describe('AppComponent', () => {
    let component: AppComponent
    let fixture: ComponentFixture<AppComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                RouterTestingModule,
                NotificationComponent
            ],
            declarations: [
                AppComponent
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: []
        }).compileComponents()

        fixture = TestBed.createComponent(AppComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create the app', () => {
        expect(component).toBeTruthy()
    })

    it('should have as title "Dashboard - Climate Action"', () => {
        expect(component.title).toEqual('Climate Action Platform')
    })

})
