import {NgModule} from '@angular/core'
import {RouterModule, Routes} from '@angular/router'

import {PageNotFoundComponent} from './page-not-found/page-not-found.component'
import {PluginsComponent} from './plugins/plugins.component'
import {ArtifactComponent} from './artifact/artifact.component'
import {DashboardComponent} from './dashboard/dashboard.component'
import {PluginComponent} from './plugin/plugin.component'

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
    },
    {
        path: 'dashboard',
        pathMatch: 'full',
        component: DashboardComponent
    },
    {
        path: 'plugins',
        pathMatch: 'full',
        component: PluginsComponent
    },
    {
        path: 'plugin/:name',
        component: PluginComponent,
        data: {
            reuse: false
        }
    },
    {
        path: 'artifacts',
        pathMatch: 'full',
        component: ArtifactComponent
    },
    {
        path: '**',
        pathMatch: 'full',
        component: PageNotFoundComponent
    }
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
