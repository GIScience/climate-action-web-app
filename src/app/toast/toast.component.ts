import {Component, OnInit} from '@angular/core';
import * as bootstrap from 'bootstrap';

import {IToastUI, ToastService} from '../services/toast.service';
import {ToastTypes} from './toasttypes.modal';

@Component({
    selector: 'app-toast',
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit {
    toastVisible = false
    title: string | undefined
    body: string | undefined
    type: string | undefined
    time: number | undefined

    constructor(private toastService: ToastService) {
    }

    ngOnInit() {
        this.toastService.showToast$.subscribe((param: IToastUI | null) => {
            if (!param)
                return

            this.title = param.title
            this.body = param.body
            this.type = ToastTypes[param.type as keyof typeof ToastTypes]
            this.time = param.time

            this.showToast()
        })
    }

    showToast() {
        const toastLiveExample = document.getElementById('liveToast')
        if (toastLiveExample) {
            const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastLiveExample)
            toastBootstrap.show()
            this.toastVisible = true
        }
        if (this.time) {
            setTimeout(() => {
                this.hideToast()
            }, this.time)
        }
    }

    hideToast() {
        this.toastVisible = false
        const toastLiveExample = document.getElementById('liveToast')
        if (toastLiveExample) {
            const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastLiveExample)
            toastBootstrap.hide()
        }
    }
}
