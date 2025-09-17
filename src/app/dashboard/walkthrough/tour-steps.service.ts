import { Injectable } from '@angular/core'
import { MapService } from '../map/map.service'
import { ExtendedDriveStep } from './tour.interfaces'

@Injectable({
    providedIn: 'root'
})
export class TourStepsService {
    private activeEventHandlers: (() => void)[] = []
    private nextStepCallback: () => void = () => {}

    constructor(private mapService: MapService) {}

    cleanupEventHandlers() {
        this.activeEventHandlers.forEach(cleanup => cleanup())
        this.activeEventHandlers = []
    }

    getFullTourSteps(): ExtendedDriveStep[] {
        return [
            this.getChoosePluginStep(),
            this.getNewComputationStep(),
            this.getSearchAreaStep(),
            this.getSelectBoundaryStep(),
            this.getRequestComputeStep(),
            this.getOpenComputationStep('full'),
            this.getViewFirstResultStep(),
            this.getExploreResultStep(),
            this.getViewChartResultStep(),
            this.getCompletionStep(false)
        ]
    }

    getGuestTourSteps(): ExtendedDriveStep[] {
        return [
            this.getChoosePluginStep(),
            this.getOpenComputationStep('guest'),
            this.getViewFirstResultStep(),
            this.getExploreResultStep(),
            this.getViewChartResultStep(),
            this.getCompletionStep(true)
        ]
    }

    private getChoosePluginStep(): ExtendedDriveStep {
        return {
            element: () =>
                this.fetchElementWithText('.plugin-card', 'hiWalk') ||
                document.querySelector('.plugin-card:nth-child(3)'),
            popover: {
                title: 'Choose an Assessment Tool',
                description:
                    'Let’s start by picking from one of the many assessment tools. We’ll use <strong>hiWalk</strong> for this example.',
                side: 'right',
                align: 'center',
                onPopoverRender: () => {
                    this.waitForClickAndElement('.plugin-card', '.new-compute')
                }
            },
            onNextClicked: () => {
                const element =
                    this.fetchElementWithText('.plugin-card', 'hiWalk') ||
                    document.querySelector('.plugin-card:nth-child(3)')
                if (element) {
                    ;(element as HTMLElement).click()
                }
            }
        }
    }

    private getNewComputationStep(): ExtendedDriveStep {
        return {
            element: 'button.new-compute',
            popover: {
                title: 'Request a New Computation',
                description:
                    'Next we’ll click on the <strong>New Computation</strong> button to initiate a new request.',
                side: 'right',
                align: 'center',
                onPopoverRender: () => {
                    this.waitForClickAndInitSearch()
                }
            },
            onNextClicked: () => {
                const newComputeBtn = document.querySelector('button.new-compute') as HTMLElement
                if (newComputeBtn) {
                    newComputeBtn.click()
                    setTimeout(() => {
                        this.prefillSearch()
                    }, 500)
                }
            }
        }
    }

    private getSearchAreaStep(): ExtendedDriveStep {
        return {
            element: () => {
                const searchInput = document.querySelector('input.search-locations') as HTMLInputElement
                if (searchInput && document.activeElement !== searchInput) {
                    searchInput.focus()
                }
                return (
                    this.fetchElementWithText('.location-suggestion__item', 'Ventotene') ||
                    document.querySelector('.location-suggestion__item:first-child')
                )
            },
            popover: {
                title: 'Search for an Area of Interest',
                description:
                    'Now we’ll have to go to the area of interest. We’ve prefilled the search with an example for you. Click on the suggestion that appears to go there on the map.',
                side: 'left',
                align: 'start',
                onPopoverRender: () => {
                    const maintainFocus = () => {
                        const searchInput = document.querySelector('input.search-locations') as HTMLInputElement
                        if (searchInput && document.activeElement !== searchInput) {
                            searchInput.focus()
                        }
                    }

                    maintainFocus()
                    const focusInterval = setInterval(maintainFocus, 100)
                    this.activeEventHandlers.push(() => clearInterval(focusInterval))

                    this.waitForClickAndElement('.location-suggestion__item:first-child')
                }
            },
            onNextClicked: () => {
                const suggestion =
                    this.fetchElementWithText('.location-suggestion__item', 'Ventotene') ||
                    document.querySelector('.location-suggestion__item:first-child')
                if (suggestion) {
                    ;(suggestion as HTMLElement).click()
                }
            }
        }
    }

    private getSelectBoundaryStep(): ExtendedDriveStep {
        return {
            element: 'app-map',
            popover: {
                title: 'Select the area boundary',
                description:
                    'Now select the area boundaries by clicking on the map. You can also zoom in and out to see the area boundaries better.',
                side: 'bottom',
                align: 'center',
                onPopoverRender: () => {
                    this.waitForBoundarySelection()
                }
            },
            onNextClicked: () => {
                if (this.mapService.map) {
                    const ventoteneCoords: [number, number] = [13.42405, 40.79237]
                    const point = this.mapService.map.project(ventoteneCoords)
                    const pixel: [number, number] = [point.x, point.y]
                    this.mapService.selectRegions(pixel)
                }
            }
        }
    }

    private getRequestComputeStep(): ExtendedDriveStep {
        return {
            element: '.plugin-parameter-container button.btn-primary',
            popover: {
                title: 'Request the computation',
                description: 'Finally, click on the <strong>Compute</strong> button to start the computation.',
                side: 'right',
                align: 'start',
                onPopoverRender: () => {
                    this.waitForClickAndElement(
                        '.plugin-parameter-container button.btn-primary',
                        '.parent-computation.is-new'
                    )
                }
            },
            onNextClicked: () => {
                const computeBtn = document.querySelector(
                    '.plugin-parameter-container button.btn-primary'
                ) as HTMLElement
                if (computeBtn) {
                    computeBtn.click()
                }
            }
        }
    }

    private getOpenComputationStep(tourType: 'guest' | 'full'): ExtendedDriveStep {
        return {
            element: () =>
                this.fetchElementWithText('.parent-computation', tourType === 'guest' ? 'Demo' : 'Ventotene') ||
                document.querySelector('.computations-container .parent-computation'),
            popover: {
                title: 'Open the computation',
                description:
                    tourType === 'guest'
                        ? 'Next, let’s open the Demo computation that has been pre-loaded for you.'
                        : 'The computation is now ready! Let’s expand it to see what results are available.',
                side: 'right',
                align: 'center',
                onPopoverRender: () => {
                    this.waitForClickAndElement('.parent-computation', '.child-computations-wrapper')
                }
            },
            onNextClicked: () => {
                const computation =
                    this.fetchElementWithText('.parent-computation', tourType === 'guest' ? 'Demo' : 'Ventotene') ||
                    document.querySelector('.computations-container .parent-computation')
                if (computation) {
                    ;(computation as HTMLElement).click()
                }
            }
        }
    }

    private getViewFirstResultStep(): ExtendedDriveStep {
        return {
            element: () =>
                this.fetchElementWithText('li.child-computation', 'Path Category') ||
                document.querySelector('li.child-computation'),
            popover: {
                title: 'View a result',
                description: 'Let’s open the first result to see what it contains.',
                side: 'right',
                align: 'center',
                onPopoverRender: () => {
                    this.waitForClickAndElement('li.child-computation .computation-content', '.artifact-header')
                }
            },
            onNextClicked: () => {
                const childComputation =
                    this.fetchElementWithText('li.child-computation .computation-content', 'Path Category') ||
                    document.querySelector('li.child-computation .computation-content')
                if (childComputation) {
                    ;(childComputation as HTMLElement).click()
                }
            }
        }
    }

    private getExploreResultStep(): ExtendedDriveStep {
        return {
            element: '.artifact-container .artifact-window-controls',
            popover: {
                title: 'Read more about the results',
                description: 'You can read more about the results, or even download the raw data from here.',
                side: 'top',
                align: 'end',
                onPopoverRender: () => {
                    this.waitForArtifactOpen()
                }
            },
            onNextClicked: () => {
                const minimiseBtn = document.querySelector(
                    '.artifact-container .artifact-window-controls button.minimise-btn'
                ) as HTMLElement
                if (minimiseBtn) {
                    minimiseBtn.click()
                }
            }
        }
    }

    private getViewChartResultStep(): ExtendedDriveStep {
        return {
            element: () =>
                this.fetchElementWithText('li.child-computation', 'Distribution of Path Categories') ||
                document.querySelector('li.child-computation:nth-child(3)'),
            popover: {
                title: 'View a different result',
                description: 'Not all results are displayed on the map. Let’s look at a chart in this result.',
                side: 'right',
                align: 'center',
                onPopoverRender: () => {
                    this.waitForClickAndElement('li.child-computation .computation-content', '.artifact-header')
                }
            },
            onNextClicked: () => {
                const childComputation =
                    this.fetchElementWithText(
                        'li.child-computation .computation-content',
                        'Distribution of Path Categories'
                    ) || document.querySelector('li.child-computation:nth-child(3) .computation-content')
                if (childComputation) {
                    ;(childComputation as HTMLElement).click()
                }
            }
        }
    }

    private getCompletionStep(isGuestTour: boolean = false): ExtendedDriveStep {
        const description = isGuestTour
            ? 'This concludes the guest tour. You may request your own custom computations for any area of interest after logging in. You can restart this walkthrough anytime from the <strong>Account</strong> menu.'
            : 'The walkthrough is now complete. Feel free to explore the other Assessment Tools and see what they can offer. You can always restart this walkthrough via the <strong>Account</strong> menu.'

        return {
            popover: {
                title: 'Done!',
                description,
                doneBtnText: 'Exit'
            }
        }
    }

    setNextStepCallback(callback: () => void) {
        this.nextStepCallback = callback
    }

    private waitForClickAndInitSearch() {
        const clickHandler = (event: Event) => {
            const target = event.target as Element
            if (target && target.closest('button.new-compute')) {
                document.removeEventListener('click', clickHandler)
                this.prefillSearch()
                const waitForSuggestions = () => {
                    const firstSuggestion = document.querySelector('.location-suggestion__item:first-child')
                    if (firstSuggestion) {
                        this.nextStepCallback()
                    } else {
                        setTimeout(waitForSuggestions, 500)
                    }
                }
                setTimeout(waitForSuggestions, 500)
            }
        }
        document.addEventListener('click', clickHandler)
        this.activeEventHandlers.push(() => document.removeEventListener('click', clickHandler))
    }

    private prefillSearch() {
        const poll = () => {
            const element = document.querySelector('.plugin-compute')
            if (element) {
                const searchInput = document.querySelector('input.search-locations') as HTMLInputElement
                if (searchInput) {
                    searchInput.focus()
                    searchInput.value = 'Ventotene'
                    searchInput.dispatchEvent(new Event('input'))
                }
            } else {
                setTimeout(poll, 500)
            }
        }
        poll()
    }

    private waitForArtifactOpen() {
        const artifactOpenBtn = document.querySelector('.artifact-container')
        if (artifactOpenBtn) {
            const clickHandler = () => {
                artifactOpenBtn.removeEventListener('click', clickHandler)
                setTimeout(() => {
                    this.nextStepCallback()
                }, 500)
            }
            artifactOpenBtn.addEventListener('click', clickHandler)
            this.activeEventHandlers.push(() => artifactOpenBtn.removeEventListener('click', clickHandler))
        }
    }

    private fetchElementWithText(selector: string, text: string): HTMLElement {
        const elements = document.querySelectorAll(selector)
        return Array.prototype.filter.call(elements, element => {
            return RegExp(text).test(element.textContent)
        })[0] as HTMLElement
    }

    private waitForClickAndElement(clickSelector: string, elementToWaitFor?: string) {
        const clickHandler = (event: Event) => {
            const target = event.target as Element
            if (target && target.closest(clickSelector)) {
                document.removeEventListener('click', clickHandler)
                if (elementToWaitFor) {
                    const poll = () => {
                        const element = document.querySelector(elementToWaitFor)
                        if (element) {
                            setTimeout(() => this.nextStepCallback(), 100)
                        } else {
                            setTimeout(poll, 500)
                        }
                    }
                    poll()
                } else {
                    this.nextStepCallback()
                }
            }
        }
        document.addEventListener('click', clickHandler)
        this.activeEventHandlers.push(() => document.removeEventListener('click', clickHandler))
    }

    private waitForBoundarySelection() {
        const poll = () => {
            const selectedRegions = document.querySelector('.selected-regions')
            if (selectedRegions) {
                const regionItems = selectedRegions.querySelectorAll('.region-item')
                if (regionItems.length === 1) {
                    const regionName = regionItems[0].querySelector('span.region-name')
                    if (regionName && regionName.textContent?.includes('Ventotene')) {
                        setTimeout(() => this.nextStepCallback(), 100)
                        return
                    }
                }
            }
            setTimeout(poll, 500)
        }
        poll()
    }
}
