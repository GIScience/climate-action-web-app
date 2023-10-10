import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { AboutComponent } from './about/about.component';
import { HelpComponent } from './help/help.component';
import { PluginsComponent } from './plugins/plugins.component';
import { ArtefactsComponent } from './artefacts/artefacts.component';

const routes: Routes = [
    // {
    //     path: '',
    //     pathMatch: 'full',
    //     redirectTo: 'plugins'
    // },
    {
        path: 'plugins',
        pathMatch: 'full',
        component: PluginsComponent,
    },
    {
        path: 'artefacts',
        pathMatch: 'full',
        component: ArtefactsComponent,
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
    // Wild Card Route for 404 request
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
