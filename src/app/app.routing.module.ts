import {NgModule} from '@angular/core'
import {RouterModule, Routes} from '@angular/router'
import {PageNotFoundComponent} from './page-not-found/page-not-found.component'
import {DashboardComponent} from './dashboard/dashboard.component'
import {PluginComponent} from './dashboard/plugin/plugin.component'

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        children: [
            {
                path: 'plugin/:name',
                component: PluginComponent
            }
        ]
    },
    {
        path: '**',
        component: PageNotFoundComponent
    }
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
