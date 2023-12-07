import {ComponentFixture, TestBed} from '@angular/core/testing'

import {ImageComponent} from './image.component'
import {HttpClientModule} from '@angular/common/http'
import {By} from '@angular/platform-browser'

describe('ImageComponent', () => {

    let component: ImageComponent
    let fixture: ComponentFixture<ImageComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ImageComponent, HttpClientModule]
        })
        fixture = TestBed.createComponent(ImageComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should render image', () => {
        component.url = 'test_image.jpg'
        fixture.detectChanges()
        const image = fixture.debugElement.query(By.css('img'))
        expect(image.nativeElement.src).toContain('test_image.jpg')
    })
})
