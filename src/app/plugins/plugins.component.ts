import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { IPlugin } from '../models/plugin.interface';

@Component({
  selector: 'app-plugins',
  templateUrl: './plugins.component.html',
  styleUrls: ['./plugins.component.scss']
})
export class PluginsComponent implements OnInit {

  plugins: Array<IPlugin> = []
  pluginGroups: any[] = []
  imageUrl: string = '../../assets/images'

  constructor() {
    this.plugins.push({
      id: 1,
      image: `${this.imageUrl}/dan-meyers-TieB9BG7ud0-unsplash.jpg`,
      title: 'Land change emission',
      desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      type: 'Land Use/Land Change',
      attribution: 'Photo by USGS on Unsplash'
  })
    this.plugins?.push({
      id: 2,
      image: `${this.imageUrl}/usgs-Yhx6-WibC3I-unsplash.jpg`,
      title: 'Wetlands preservation',
      desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      type: 'Land Use/Land Change',
      attribution: 'Photo by USGS on Unsplash'
    })

    this.plugins?.push({
      id: 3,
      image: `${this.imageUrl}/ivan-bandura-hqnUYXsN5oY-unsplash.jpg`,
      title: 'Permafrost',
      desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      type: 'Land Use/Land Change',
      attribution: 'Photo by Ivan Bandura on Unsplash'
    })

    this.plugins?.push({
      id: 4,
      image: `${this.imageUrl}/ivan-bandura-XsAz9Mq61XY-unsplash.jpg`,
      title: 'Producers',
      desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      type: 'Energy consumption',
      attribution: 'Photo by USGS on Unsplash'
    })
    this.plugins?.push({
      id: 9,
      image: `${this.imageUrl}/ivan-bandura-QW3oA2wkPyw-unsplash.jpg`,
      title: 'Land change emission',
      desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      type: 'Land Use/Land Change',
      attribution: 'Photo by Ivan Bandura on Unsplash'
    })
    // this.plugins?.push({
    //   id: 6,
    //   image: `${this.imageUrl}/usgs-Yhx6-WibC3I-unsplash.jpg`,
    //   title: 'Wetlands preservation',
    //   desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    //   type: 'Land Use/Land Change',
    //   attribution: 'Photo by USGS on Unsplash'
    // })

    // this.plugins?.push({
    //   id: 7,
    //   image: `${this.imageUrl}/ivan-bandura-hqnUYXsN5oY-unsplash.jpg`,
    //   title: 'Permafrost',
    //   desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    //   type: 'Land Use/Land Change',
    //   attribution: 'Photo by Ivan Bandura on Unsplash'
    // })

    this.plugins?.push({
      id: 8,
      image: `${this.imageUrl}/ivan-bandura-mOJZO-p5udA-unsplash.jpg`,
      title: 'Producers',
      desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      type: 'Energy consumption',
      attribution: 'Photo by Ivan Bandura on Unsplash'
    })
    this.plugins?.push({
      id: 9,
      image: `${this.imageUrl}/dan-meyers-TieB9BG7ud0-unsplash.jpg`,
      title: 'Land change emission',
      desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      type: 'Land Use/Land Change',
      attribution: 'Photo by Dan Meyers on Unsplash'
    })
  }

  ngOnInit(): void {
    // calculate slider progress
    // give some time to load the items and then calculate the progressbar
    setTimeout(() => {
      this.calculateProgressBar();  
    }, 200);   
  }

  
  calculateProgressBar() {
    const progressBarElements = document.querySelectorAll(".progress-bar");
    progressBarElements.forEach((progressBar) => {
      progressBar.innerHTML = "";

      const slider = document.querySelector(".slider") as HTMLElement;
      if(slider == null) return
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

  onClick(direction: string) {
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
}
