import { inject } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router'
import { computationRouteCommands } from './share.service'

/**
 * Rewrites legacy share links (/dashboard/plugin/{pluginId}?share-id={uuid})
 * to the deep-link route (/dashboard/plugin/{pluginId}/computation/{uuid}).
 */
export const shareIdRedirectGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const shareId = route.queryParamMap.get('share-id')
    if (!shareId) return true

    const router = inject(Router)
    return router.createUrlTree(computationRouteCommands(route.params['name'], shareId))
}
