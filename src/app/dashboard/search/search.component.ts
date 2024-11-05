import {OnInit, Component} from '@angular/core'
import {CommonModule} from '@angular/common'
import {MapService} from '../map/map.service'
import {FormsModule, ReactiveFormsModule} from '@angular/forms'
import {FormControl} from '@angular/forms'
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators'
import {SearchTermHighlightPipe} from './search-highlight.pipe'
import {NgScrollbar} from 'ngx-scrollbar' 
import {Coordinate} from 'ol/coordinate'
import {GeoJSONFeatureCollection} from 'ol/format/GeoJSON'
import {LucideAngularModule, CircleX} from 'lucide-angular'

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SearchTermHighlightPipe,
        LucideAngularModule,
        NgScrollbar
    ],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss'
})

export class SearchComponent implements OnInit {
    searchControl = new FormControl()
    suggestions: GeoJSONFeatureCollection[] = []

    readonly CircleX = CircleX

    constructor(private mapService: MapService) { }

    ngOnInit(): void {
        this.searchControl.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(query => {
                if (query) {
                    return this.mapService.getAutoCompleteSuggestions(query)
                } else {
                    this.suggestions = []
                    return []
                }
            })
        ).subscribe((results: GeoJSONFeatureCollection[]) => {
            this.suggestions = results
        })
    }

    formatLocation(properties: GeoJSONFeatureCollection): string {
        const {layer, locality, county, region, country} = properties
    
        const parts = [
            {value: locality, key: 'locality'},
            {value: county, key: 'county'},
            {value: region, key: 'region'},
            {value: country, key: 'country'}
        ]
        .filter(part => 
            part.value &&
            part.key !== layer &&
            !(part.key === 'locality' && part.value === county)
        )
        .map(part => part.value)
    
        return parts.join(', ')
    }

    highlightSuggestion(suggestion: GeoJSONFeatureCollection) {
        const coordinates = suggestion.geometry.coordinates as Coordinate
        this.mapService.highlightLocationOnMap(coordinates)
    }

    selectSuggestion(suggestion: GeoJSONFeatureCollection) {
        this.searchControl.setValue(suggestion.properties.label, {emitEvent: false})
        this.suggestions = []
        this.mapService.searchLocation(suggestion.properties.label)
    }

    clearSearch() {
        this.searchControl.setValue('')
        this.suggestions = []
        this.mapService.markerFeatures.clear()
    }
}