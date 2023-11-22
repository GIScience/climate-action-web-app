import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {PageNotFoundComponent} from './page-not-found/page-not-found.component';
import {AboutComponent} from './about/about.component';
import {HelpComponent} from './help/help.component';
import {PluginsComponent} from './plugins/plugins.component';
import {ArtifactsComponent} from './artifacts/artifacts.component';
import {DashboardComponent} from "./dashboard/dashboard.component";
import {PluginComponent} from "./plugin/plugin.component";

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
        component: PluginsComponent,
    },
    {
        path: 'plugin/:name',
        component: PluginComponent,
    },
    {
        path: 'artifacts',
        pathMatch: 'full',
        component: ArtifactsComponent,
    },
    {
        path: 'about',
        pathMatch: 'full',
        component: AboutComponent
    },
    {
        path: 'help',
        pathMatch: 'full',
        component: HelpComponent
    },
    {
        path: '**',
        pathMatch: 'full',
        component: PageNotFoundComponent
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
