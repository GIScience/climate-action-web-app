import { TestBed } from '@angular/core/testing'
import {
    ActivatedRouteSnapshot,
    convertToParamMap,
    Router,
    RouterModule,
    RouterStateSnapshot,
    UrlTree
} from '@angular/router'
import { shareIdRedirectGuard } from './share-redirect.guard'

const UUID = '8a897536-c4b4-4e5a-9d70-50430183ac66'

function createSnapshot(pluginName: string, queryParams: Record<string, string>): ActivatedRouteSnapshot {
    return {
        params: { name: pluginName },
        queryParamMap: convertToParamMap(queryParams)
    } as unknown as ActivatedRouteSnapshot
}

describe('shareIdRedirectGuard', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [RouterModule.forRoot([])] })
    })

    function runGuard(snapshot: ActivatedRouteSnapshot): boolean | UrlTree {
        return TestBed.runInInjectionContext(() => shareIdRedirectGuard(snapshot, {} as RouterStateSnapshot)) as
            boolean | UrlTree
    }

    it('should allow navigation when no share-id param is present', () => {
        expect(runGuard(createSnapshot('test_plugin', {}))).toBe(true)
    })

    it('should rewrite legacy ?share-id= links to the computation deep-link route', () => {
        const result = runGuard(createSnapshot('test_plugin', { 'share-id': UUID }))

        expect(result).toBeInstanceOf(UrlTree)
        expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
            `/dashboard/plugin/test_plugin/computation/${UUID}`
        )
    })
})
