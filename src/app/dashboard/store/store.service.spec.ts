import { HttpClient, HttpClientModule } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { jest } from '@jest/globals'
import { of } from 'rxjs'
import { StoreService } from './store.service'

describe('StoreService', () => {
    let service: StoreService
    let httpClientSpy: {
        get: jest.Mock
    }

    const correlation_uuid = 'd9660bee-85ca-40c1-80b8-b51c5fd0cd9f'
    const filename = '063c0ef6-5955-4b10-84c2-45e7b4cccf05'
    const presigned_url = `https://storage.example.com/${correlation_uuid}/${filename}?X-Amz-Signature=abc`

    beforeEach(() => {
        httpClientSpy = {
            get: jest.fn().mockImplementation(() => of({ go_to: presigned_url }))
        }

        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpClientSpy
                }
            ]
        })
        service = TestBed.inject(StoreService)
    })

    it('should resolve the presigned download url', done => {
        service.getArtifactS3Url(correlation_uuid, filename).subscribe(url => {
            expect(url).toEqual(presigned_url)
            expect(httpClientSpy.get).toHaveBeenCalledWith(
                expect.stringContaining(`/store/${correlation_uuid}/${filename}`)
            )
            done()
        })
    })
})
