import {TestBed} from '@angular/core/testing'

import {IToastUI, ToastService} from './toast.service'

describe('ToastService', () => {
    let service: ToastService

    const test_toast = {
        title: 'title',
        body: 'some text',
        type: 'toast type',
        time: 123567
    } as IToastUI

    beforeEach(() => {
        TestBed.configureTestingModule({})
        service = TestBed.inject(ToastService)
    })

    it('should be created', () => {
        expect(service).toBeTruthy()
    })

    it('should emit toast', done => {
        service.next(test_toast)
        service.showToast$.subscribe((x) => {
            expect(x).toEqual(test_toast)
            done()
        })
    })
})
