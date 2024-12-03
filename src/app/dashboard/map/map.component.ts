import {Component, AfterViewInit} from '@angular/core'
import {MapService} from './map.service'

@Component({
  selector: 'app-map',
  imports: [],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  standalone: true
})
export class MapComponent implements AfterViewInit {

    constructor(private mapService: MapService) {}

    ngAfterViewInit(): void {
        this.mapService.initMap()
    }
}