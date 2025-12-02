import { AfterViewInit, Component, inject } from '@angular/core'
import { MapService } from './map.service'

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
    standalone: true
})
export class MapComponent implements AfterViewInit {
    private mapService = inject(MapService)

    ngAfterViewInit(): void {
        this.mapService.initMap('main-map')
    }
}
