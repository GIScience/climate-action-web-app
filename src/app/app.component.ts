import {Component} from '@angular/core'
import {ArtifactService} from './dashboard/artifact/artifact.service'
import {MapService} from './dashboard/map/map.service'
import {default as packageInfo} from '../../package.json'

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent  {
    title = 'Climate Action Platform'
    name = 'HeiGIT'
    version: string = packageInfo.version

    currentYear(): number {
        return new Date().getFullYear()
    }

    constructor(
        public artifactService: ArtifactService,
        public mapService: MapService
    ) {}

    resetMapState() {
        this.artifactService.closeArtifact()
        this.mapService.removeFocusedLayer()
        this.mapService.removeComputeLayers()
    }
}
