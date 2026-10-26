import { Injectable, inject } from '@angular/core'
import { Params, Router } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import { ToastrService } from 'ngx-toastr'

export function computationRouteCommands(pluginId: string, correlationUuid: string): string[] {
    return ['/dashboard/plugin', pluginId, 'computation', correlationUuid]
}

@Injectable({
    providedIn: 'root'
})
export class ShareService {
    private router = inject(Router)
    private toastr = inject(ToastrService)
    private translocoService = inject(TranslocoService)

    getShareUrl(pluginId: string, correlationUuid: string, artifactFilename?: string, tag?: string): string {
        const queryParams: Params = {}
        if (artifactFilename) queryParams['artifact'] = artifactFilename
        if (tag) queryParams['tag'] = tag

        const tree = this.router.createUrlTree(computationRouteCommands(pluginId, correlationUuid), { queryParams })
        return window.location.origin + this.router.serializeUrl(tree)
    }

    copyShareLink(pluginId: string, correlationUuid: string, artifactFilename?: string, tag?: string): void {
        navigator.clipboard.writeText(this.getShareUrl(pluginId, correlationUuid, artifactFilename, tag))
        this.toastr.info(this.translocoService.translate('computationDetail.linkCopied'), '', { timeOut: 4000 })
    }
}
