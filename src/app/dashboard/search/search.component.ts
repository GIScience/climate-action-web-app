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
    firstSuggestionItem: HTMLElement | null = null
    searchInput: HTMLInputElement | null = null
    isFetchingSuggestions = false
    isSearchActive = false

    readonly CircleX = CircleX

    constructor(private mapService: MapService) { }

    ngOnInit(): void {
        setTimeout(() => {
            this.searchInput = document.querySelector('.search-locations')
        })

        this.searchControl.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(query => {
                if (query) {
                    this.isFetchingSuggestions = true
                    this.isSearchActive = true
                    return this.mapService.getAutoCompleteSuggestions(query)
                } else {
                    this.suggestions = []
                    this.isSearchActive = false
                    return []
                }
            })
        ).subscribe({
            next: (results: GeoJSONFeatureCollection[]) => {
                this.suggestions = results
                this.isFetchingSuggestions = false
                if (results.length > 0) {
                    setTimeout(() => {
                        this.firstSuggestionItem = document.querySelector('.location-suggestion__item')
                        this.firstSuggestionItem?.focus()
                    })
                }
            },
            error: () => {
                this.isFetchingSuggestions = false
            }
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
        this.isSearchActive = false
        this.mapService.goToLocation(suggestion)
    }

    clearSearch() {
        this.searchControl.setValue('')
        this.suggestions = []
        this.isSearchActive = false
        this.mapService.markerFeatures.clear()
    }

    onSuggestionKeydown(event: KeyboardEvent) {
        if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
            this.searchInput?.focus()
            return
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            
            const currentElement = event.target as HTMLElement
            const items = Array.from(document.querySelectorAll('.location-suggestion__item'))
            const currentIndex = items.indexOf(currentElement)
            
            let nextIndex
            if (event.key === 'ArrowDown') {
                nextIndex = currentIndex + 1 >= items.length ? 0 : currentIndex + 1
            } else {
                nextIndex = currentIndex - 1 < 0 ? items.length - 1 : currentIndex - 1
            }
            
            (items[nextIndex] as HTMLElement).focus()
        }
    }
}