import { TestBed } from '@angular/core/testing'
import { RouterModule } from '@angular/router'
import { ToastrService } from 'ngx-toastr'
import { getTranslocoTestingModule, MockToastrService } from '../../../../jest.mocks'
import { ShareService } from './share.service'

const UUID = '8a897536-c4b4-4e5a-9d70-50430183ac66'

describe('ShareService', () => {
    let service: ShareService

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterModule.forRoot([]), getTranslocoTestingModule()],
            providers: [{ provide: ToastrService, useClass: MockToastrService }]
        })
        service = TestBed.inject(ShareService)
    })

    it('should build a deep link to the computation detail route', () => {
        expect(service.getShareUrl('test_plugin', UUID)).toBe(
            `${window.location.origin}/dashboard/plugin/test_plugin/computation/${UUID}`
        )
    })

    it('should append the artifact query param when a filename is given', () => {
        expect(service.getShareUrl('test_plugin', UUID, 'blueprint_image.png')).toBe(
            `${window.location.origin}/dashboard/plugin/test_plugin/computation/${UUID}?artifact=blueprint_image.png`
        )
    })

    it('should append the tag query param when a tag is given', () => {
        expect(service.getShareUrl('test_plugin', UUID, undefined, 'analysis')).toBe(
            `${window.location.origin}/dashboard/plugin/test_plugin/computation/${UUID}?tag=analysis`
        )
    })

    it('should copy the share link to the clipboard and notify the user', () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: jest.fn().mockResolvedValue(undefined) },
            configurable: true
        })

        service.copyShareLink('test_plugin', UUID, 'blueprint_image.png', 'analysis')

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            `${window.location.origin}/dashboard/plugin/test_plugin/computation/${UUID}?artifact=blueprint_image.png&tag=analysis`
        )
        expect(TestBed.inject(ToastrService).info).toHaveBeenCalled()
    })

    it('should append both artifact and tag query params when given', () => {
        expect(service.getShareUrl('test_plugin', UUID, 'blueprint_image.png', 'analysis')).toBe(
            `${window.location.origin}/dashboard/plugin/test_plugin/computation/${UUID}?artifact=blueprint_image.png&tag=analysis`
        )
    })
})
