import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { DashboardComponent } from './dashboard/dashboard.component'
import { LandingComponent } from './dashboard/landing/landing.component'
import { PluginComponent } from './dashboard/plugin/plugin.component'
import { PageNotFoundComponent } from './page-not-found/page-not-found.component'

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
                path: '',
                component: LandingComponent
            },
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
export class AppRoutingModule {}
