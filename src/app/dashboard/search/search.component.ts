import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { TranslocoModule } from '@jsverse/transloco'
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
        NgScrollbar,
        TranslocoModule
    ],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss'
})
export class SearchComponent implements OnInit {
    searchControl = new FormControl()
    suggestions: AutocompleteFeature[] = []
    searchInput: HTMLInputElement | null = null
    isFetchingSuggestions = false
    isSearchInputEmpty = true
    isInputFocused = false
    private blurTimeout: ReturnType<typeof setTimeout> | null = null

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
                        this.isSearchInputEmpty = false
                        return this.mapService.getAutoCompleteSuggestions(query)
                    } else {
                        this.suggestions = []
                        this.isSearchInputEmpty = true
                        return []
                    }
                })
            )
            .subscribe({
                next: (results: AutocompleteFeature[]) => {
                    this.suggestions = results
                    this.isFetchingSuggestions = false
                },
                error: error => {
                    this.isFetchingSuggestions = false
                    console.warn('Search suggestions could not be fetched:', error)
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
        this.isInputFocused = false
        this.mapService.flyToExtent(suggestion)
    }

    clearSearch() {
        this.searchControl.setValue('')
        this.suggestions = []
        this.isSearchInputEmpty = true
        this.mapService.markerLayer.forEach(marker => marker.remove())
        this.mapService.markerLayer = []
        this.mapService.markerFeatures = []
    }

    onInputEnter() {
        if (this.searchControl.value) {
            this.isFetchingSuggestions = true
            this.isSearchInputEmpty = false
            this.mapService.getAutoCompleteSuggestions(this.searchControl.value).subscribe({
                next: (results: AutocompleteFeature[]) => {
                    this.suggestions = results
                    this.isFetchingSuggestions = false
                },
                error: error => {
                    this.isFetchingSuggestions = false
                    console.warn('Search suggestions could not be fetched:', error)
                }
            })
        }
    }

    // Delay hiding suggestions so click handlers can finish before the DOM disappears

    onInputBlur() {
        this.blurTimeout = setTimeout(() => {
            this.isInputFocused = false
        }, 150)
    }

    onInputFocus() {
        this.isInputFocused = true
        if (this.blurTimeout) {
            clearTimeout(this.blurTimeout)
            this.blurTimeout = null
        }
    }
}
