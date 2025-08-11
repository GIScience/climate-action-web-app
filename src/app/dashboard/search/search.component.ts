import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { CircleX, LucideAngularModule } from 'lucide-angular'
import { NgScrollbar } from 'ngx-scrollbar'
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators'
import { AutocompleteFeature, MapService } from '../map/map.service'
import { SearchTermHighlightPipe } from './search-highlight.pipe'

@Component({
    selector: 'app-search',
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
    suggestions: AutocompleteFeature[] = []
    firstSuggestionItem: HTMLElement | null = null
    searchInput: HTMLInputElement | null = null
    isFetchingSuggestions = false
    isSearchActive = false

    readonly CircleX = CircleX

    constructor(public mapService: MapService) {}

    ngOnInit(): void {
        setTimeout(() => {
            this.searchInput = document.querySelector('.search-locations')
        })

        this.searchControl.valueChanges
            .pipe(
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
            )
            .subscribe({
                next: (results: AutocompleteFeature[]) => {
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

    formatLocation(suggestion: AutocompleteFeature): string {
        const properties = suggestion.properties
        const { layer, locality, county, region, country } = properties

        const parts = [
            { value: locality, key: 'locality' },
            { value: county, key: 'county' },
            { value: region, key: 'region' },
            { value: country, key: 'country' }
        ]
            .filter(part => part.value && part.key !== layer && !(part.key === 'locality' && part.value === county))
            .map(part => part.value)

        return parts.join(', ')
    }

    selectSuggestion(suggestion: AutocompleteFeature) {
        this.searchControl.setValue(suggestion.properties?.name, {
            emitEvent: false
        })
        this.suggestions = []
        this.isSearchActive = false
        this.mapService.flyToExtent(suggestion)
    }

    clearSearch() {
        this.searchControl.setValue('')
        this.suggestions = []
        this.isSearchActive = false
        this.mapService.markerLayer.forEach(marker => marker.remove())
        this.mapService.markerLayer = []
        this.mapService.markerFeatures = []
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

            ;(items[nextIndex] as HTMLElement).focus()
        }
    }
}
