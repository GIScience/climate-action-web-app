import {ComponentFixture, TestBed} from '@angular/core/testing'
import {NotificationComponent} from './notification.component'
import {HttpClientModule} from '@angular/common/http'
import {MatListModule} from '@angular/material/list'

describe('NotificationComponent', () => {
    let component: NotificationComponent
    let fixture: ComponentFixture<NotificationComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                MatListModule,
                NotificationComponent
            ]
        })
        fixture = TestBed.createComponent(NotificationComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should update the notification log', () => {
        expect(component.getNotificationLog()).toHaveSize(0)
        expect(component.newNotifications).toEqual(0)

        component.updateNotificationLog({
            correlation_uuid: 'c0c007ac-766a-42c2-8655-dbb03e6e5937',
            message: 'test',
            type: 'computation_status',
            status: 'in-progress',
            timestamp: '2023-12-14T15:20:54.929914'
        })

        expect(localStorage.getItem(component.NOTIFICATION_LOG)).toBeTruthy()
        expect(component.getNotificationLog()).toHaveSize(1)
        expect(component.newNotifications).toEqual(1)
    })
})
