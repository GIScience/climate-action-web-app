import { Component, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core'
import { ChevronLeft, ChevronRight, ExternalLink, LucideAngularModule } from 'lucide-angular'
import { StatusAnnouncementsService } from './status-announcements.service'

const CYCLE_MS = 7000

@Component({
    selector: 'app-status-notices',
    templateUrl: './status-notices.component.html',
    styleUrls: ['./status-notices.component.scss'],
    host: {
        '(mouseenter)': 'pause()',
        '(mouseleave)': 'resume()'
    },
    imports: [LucideAngularModule]
})
export class StatusNoticesComponent implements OnDestroy {
    private statusAnnouncements = inject(StatusAnnouncementsService)

    readonly notices = this.statusAnnouncements.notices
    readonly index = signal(0)
    readonly current = computed(() => this.notices()[this.index()])

    readonly ChevronLeft = ChevronLeft
    readonly ChevronRight = ChevronRight
    readonly ExternalLink = ExternalLink

    private timer?: ReturnType<typeof setInterval>
    private paused = false

    constructor() {
        // Whenever the notices list changes, keep the index in range and restart auto-cycling.
        // Index is read untracked so advancing the slider doesn't retrigger this effect.
        effect(() => {
            const count = this.notices().length
            untracked(() => {
                if (this.index() >= count) this.index.set(0)
            })
            this.restartCycling(count)
        })
    }

    next(): void {
        const count = this.notices().length
        if (count) this.index.set((this.index() + 1) % count)
    }

    prev(): void {
        const count = this.notices().length
        if (count) this.index.set((this.index() - 1 + count) % count)
    }

    // Pause cycling while the pointer is over the section, resume on leave.
    pause(): void {
        this.paused = true
        this.stopCycling()
    }

    resume(): void {
        this.paused = false
        this.restartCycling()
    }

    // Run a single timer only when there's more than one notice and we're not paused.
    private restartCycling(count = this.notices().length): void {
        this.stopCycling()
        if (count > 1 && !this.paused) this.startCycling()
    }

    private startCycling(): void {
        this.timer = setInterval(() => this.next(), CYCLE_MS)
    }

    private stopCycling(): void {
        if (this.timer) clearInterval(this.timer)
        this.timer = undefined
    }

    ngOnDestroy(): void {
        this.stopCycling()
    }
}
