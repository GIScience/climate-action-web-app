import {TestBed} from '@angular/core/testing'

import {ReportService} from './report.service'
import {HttpClientModule} from "@angular/common/http"

describe('ReportService', () => {
    let service: ReportService

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule]
        })
        service = TestBed.inject(ReportService)
    })

    it('should be created', () => {
        expect(service).toBeTruthy()
    })
})
