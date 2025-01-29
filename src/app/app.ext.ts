import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router'

@Injectable()
export class CustomRouteReuseStrategy extends BaseRouteReuseStrategy {
    override shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
        const reuse = super.shouldReuseRoute(future, current)
        const curr_reuse = 'reuse' in current.data ? current.data['reuse'] : true
        return reuse && curr_reuse
    }
}
