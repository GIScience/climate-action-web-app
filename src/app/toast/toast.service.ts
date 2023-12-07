import {Injectable} from '@angular/core'
import {BehaviorSubject} from 'rxjs'

@Injectable({
    providedIn: 'root'
})
export class ToastService {

    private toastSubject = new BehaviorSubject<IToastUI | null>(null)
    showToast$ = this.toastSubject.asObservable()

    next(param: IToastUI) {
        this.toastSubject.next(param)
    }
}

export interface IToastUI {
    title: string,
    body: string,
    type: string,
    time?: number
}
