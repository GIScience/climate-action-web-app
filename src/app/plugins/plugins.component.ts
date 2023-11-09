import {AfterViewInit, Component, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {Plugin} from '../models/plugin.interface';
import {UserPlugin} from "../models/user-plugin.interface";
import {UserPluginListService} from "../services/user-plugin-list.service";
import {PluginService} from "../services/plugin.service";

@Component({
    selector: 'app-plugins',
    templateUrl: './plugins.component.html',
    styleUrls: ['./plugins.component.scss']
})
export class PluginsComponent implements OnInit, AfterViewInit {

    plugins: Array<Plugin> = []

    constructor(
        private router: Router,
        private userPluginListService: UserPluginListService,
        private pluginService: PluginService) {}

    ngOnInit(): void {
        // calculate slider progress
        // give some time to load the items and then calculate the progressbar
        setTimeout(() => {
            this.calculateProgressBar();
        }, 200);
    }

    ngAfterViewInit(): void {
        const slider = document.querySelector(".slider") as HTMLElement;
        slider.style.setProperty("--slider-index", '0');

        // get plugins from API
        this.loadPlugins()
    }

    calculateProgressBar() {
        const progressBarElements = document.querySelectorAll(".progress-bar");
        progressBarElements.forEach((progressBar) => {
            progressBar.innerHTML = "";

            const slider = document.querySelector(".slider") as HTMLElement;
            if (slider == null) return
            const itemCount = slider.children.length;
            const itemsPerScreen = parseInt(getComputedStyle(slider).getPropertyValue("--items-per-screen"));
            let sliderIndex = parseInt(getComputedStyle(slider).getPropertyValue("--slider-index"));
            const progressBarItemCount = Math.ceil(itemCount / itemsPerScreen);

            if (sliderIndex >= progressBarItemCount) {
                slider.style.setProperty("--slider-index", progressBarItemCount - 1 + '');
                sliderIndex = progressBarItemCount - 1;
            }

            for (let i = 0; i < progressBarItemCount; i++) {
                const barItem = document.createElement("div");
                barItem.classList.add("progress-item");
                if (i === sliderIndex) {
                    barItem.classList.add("active");
                }
                progressBar.appendChild(barItem);
            }
        });
    }

    onSlideClick(direction: string) {
        const progressBar = document.querySelector(".progress-bar");
        const slider = document.querySelector(".slider") as HTMLElement;
        if (slider === null || progressBar === null) return;

        const sliderIndex = parseInt(getComputedStyle(slider).getPropertyValue("--slider-index"));
        const progressBarItemCount = progressBar.children.length;

        let newIndex;

        if (direction === "left") {
            newIndex = sliderIndex - 1 < 0 ? progressBarItemCount - 1 : sliderIndex - 1;
        } else if (direction === "right") {
            newIndex = sliderIndex + 1 >= progressBarItemCount ? 0 : sliderIndex + 1;
        } else {
            return; // Invalid direction
        }

        slider.style.setProperty("--slider-index", newIndex + '');
        progressBar.children[sliderIndex].classList.remove("active");
        progressBar.children[newIndex].classList.add("active");
    }

    private throttle(cb: Function, delay = 1000) {
        let shouldWait = false;
        let waitingArgs: any[] | null = null;

        const timeoutFunc = () => {
            if (waitingArgs === null) {
                shouldWait = false;
            } else {
                cb(...waitingArgs);
                waitingArgs = null;
                setTimeout(timeoutFunc, delay);
            }
        };

        return (...args: any[]) => {
            if (shouldWait) {
                waitingArgs = args;
                return;
            }

            cb(...args);
            shouldWait = true;
            setTimeout(timeoutFunc, delay);
        };
    }

    private throttleProgressBar = this.throttle(() => {
        this.calculateProgressBar();
    });

    /**
     * Gets plugins from API
     */
    loadPlugins() {
        this.pluginService.getPlugins().subscribe({
            next: (data) => {
                console.log('response from /plugin ', data)
                this.plugins = data;
            },
            error: error => {
                console.error('Error fetching plugins:', error);
            }
        });
    }

    /**
     * Add a plugin to User's plugin list
     *
     * @param plugin
     */
    /*addPlugin(plugin: Plugin) {
        console.log('>>> addPlugin ', plugin.id)
        // get plugin details from pluginId

        // form a UserPlugin object
        let tempUserPlugin: UserPlugin = {
            id: plugin.id,
            title: plugin.title
        }
        this.userPluginListService.addPlugin(tempUserPlugin);
    }*/

    /**
     * Deletes a plugin (with all it's artifacts) from the user's plugin list
     *
     * @param pluginId
     */
    /*deletePlugin(pluginId: number) {
        console.log('>>> deletePlugin ', pluginId)
        this.userPluginListService.deletePlugin(pluginId)
    }*/

    /**
     * Redirect to /plugin/{id} to show plugin's details
     *
     * @param pluginId
     */
    showPluginInfo(pluginId: string) {
        this.router.navigate(['plugin', pluginId]);
    }
}
