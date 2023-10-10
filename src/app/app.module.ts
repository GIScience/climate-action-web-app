import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DataService } from './data.service';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ToastComponent } from './toast/toast.component';
import { ToastService } from './toast.service';
import { AboutComponent } from './about/about.component';
import { NgOptimizedImage } from '@angular/common';
// import { HelpComponent } from './help/help.component';
import { PluginsComponent } from './plugins/plugins.component';
import { ArtefactsComponent } from './artefacts/artefacts.component';
import { ReportComponent } from './report/report.component';

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent,
    ToastComponent,
    AboutComponent,
    // HelpComponent,
    PluginsComponent,
    ArtefactsComponent,
    CardsComponent,
    ReportComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    // AppRoutingModule,
    HttpClientModule,
    NgOptimizedImage
  ],
  providers: [
    DataService,
    ToastService,
    // { provide: APP_INITIALIZER, useFactory: metadataFactory, deps: [DataService], multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

// export function metadataFactory(provider: DataService) {
//   return () => provider.requestMetadata();
// }
