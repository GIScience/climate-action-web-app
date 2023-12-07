import {AfterViewInit, Component, OnInit} from '@angular/core'
import {Router} from '@angular/router'
import {PluginService} from '../plugin/plugin.service'
import {CommonModule} from '@angular/common'
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {availableCards, PluginCard} from './plugins.interface';

@Component({
    selector: 'app-plugins',
    templateUrl: './plugins.component.html',
    styleUrls: ['./plugins.component.scss'],
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatTooltipModule
    ],
    standalone: true
})
export class PluginsComponent implements OnInit, AfterViewInit {

    cards: Array<PluginCard> = availableCards

    constructor(
        private router: Router,
        private pluginService: PluginService) {
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.calculateProgressBar()
        }, 200)
    }

    ngAfterViewInit(): void {
        const slider = document.querySelector('.slider') as HTMLElement
        slider.style.setProperty('--slider-index', '0')
        this.loadPlugins()
    }

    calculateProgressBar() {
        const progressBarElements = document.querySelectorAll('.progress-bar')
        progressBarElements.forEach((progressBar) => {
            progressBar.innerHTML = ''

            const slider = document.querySelector('.slider') as HTMLElement
            if (slider == null) return
            const itemCount = slider.children.length
            const itemsPerScreen = parseInt(getComputedStyle(slider).getPropertyValue('--items-per-screen'))
            let sliderIndex = parseInt(getComputedStyle(slider).getPropertyValue('--slider-index'))
            const progressBarItemCount = Math.ceil(itemCount / itemsPerScreen);

            if (sliderIndex >= progressBarItemCount) {
                slider.style.setProperty('--slider-index', progressBarItemCount - 1 + '')
                sliderIndex = progressBarItemCount - 1
            }

            for (let i = 0; i < progressBarItemCount; i++) {
                const barItem = document.createElement('div')
                barItem.classList.add('progress-item')
                if (i === sliderIndex) {
                    barItem.classList.add('active')
                }
                progressBar.appendChild(barItem)
            }
        })
    }

    onSlideClick(direction: string) {
        const progressBar = document.querySelector('.progress-bar')
        const slider = document.querySelector('.slider') as HTMLElement
        if (slider === null || progressBar === null) return

        const sliderIndex = parseInt(getComputedStyle(slider).getPropertyValue('--slider-index'))
        const progressBarItemCount = progressBar.children.length

        let newIndex

        if (direction === 'left') {
            newIndex = sliderIndex - 1 < 0 ? progressBarItemCount - 1 : sliderIndex - 1
        } else if (direction === 'right') {
            newIndex = sliderIndex + 1 >= progressBarItemCount ? 0 : sliderIndex + 1
        } else {
            return
        }

        slider.style.setProperty('--slider-index', newIndex + '')
        progressBar.children[sliderIndex].classList.remove('active')
        progressBar.children[newIndex].classList.add('active')
    }

    loadPlugins() {
        this.pluginService.getPlugins().subscribe({
            next: (data) => {
                data.forEach((plugin) => {
                    const card = availableCards.find((x) => x.plugin_id == plugin.plugin_id);
                    if (card) {
                        card.enabled = true
                        card.library_version = plugin.library_version
                        card.version = plugin.version
                        card.purpose = plugin.purpose
                    }
                })
            },
            error: error => {
                console.error('Error fetching plugins:', error)
            }
        })
    }

    showPluginInfo(pluginId: string) {
        this.router.navigate(['plugin', pluginId])
    }
}
