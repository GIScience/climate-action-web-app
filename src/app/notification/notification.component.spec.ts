import {ComponentFixture, TestBed} from '@angular/core/testing'
import {NotificationComponent} from './notification.component'
import {HttpClientModule} from '@angular/common/http'

describe('RunsComponent', () => {
    let component: NotificationComponent
    let fixture: ComponentFixture<NotificationComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            declarations: [NotificationComponent]
        })
        fixture = TestBed.createComponent(NotificationComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })
})
