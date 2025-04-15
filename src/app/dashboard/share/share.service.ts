import { Injectable } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { BehaviorSubject, filter, map, take } from 'rxjs'
import { getCurrentCanonicalUrl } from '../../utils/url.utils'

@Injectable({
    providedIn: 'root'
})
export class ShareService {
    private computationToImport = new BehaviorSubject<string | null>(null)

    constructor(
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.route.queryParams
            .pipe(
                map(params => params['share-id']),
                filter(shareId => !!shareId),
                take(1)
            )
            .subscribe(shareId => {
                if (shareId) {
                    this.computationToImport.next(shareId)
                    this.router.navigate([], {
                        relativeTo: this.route,
                        queryParams: { 'share-id': null },
                        queryParamsHandling: 'merge'
                    })
                }
            })
    }

    getShareUrl(computationId: string): string {
        return `${getCurrentCanonicalUrl()}?share-id=${computationId}`
    }

    onComputationToImport() {
        return this.computationToImport.asObservable().pipe(
            filter(shareId => !!shareId),
            map(shareId => {
                this.computationToImport.next(null)
                return shareId
            })
        )
    }
}
