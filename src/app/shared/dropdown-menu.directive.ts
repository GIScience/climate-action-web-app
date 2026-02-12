import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay'
import { TemplatePortal } from '@angular/cdk/portal'
import {
    Directive,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    TemplateRef,
    ViewContainerRef,
    inject
} from '@angular/core'

const DEFAULT_POSITIONS: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' }
]

@Directive({
    selector: '[appDropdownMenu]',
    standalone: true
})
export class DropdownMenuDirective implements OnChanges, OnDestroy {
    private overlay = inject(Overlay)
    private templateRef = inject(TemplateRef)
    private viewContainerRef = inject(ViewContainerRef)

    @Input({ required: true }) appDropdownMenu!: Element
    @Input() dropdownOpen = false
    @Input() dropdownPositions: ConnectedPosition[] = DEFAULT_POSITIONS
    @Output() dropdownClosed = new EventEmitter<void>()

    private overlayRef: OverlayRef | null = null

    ngOnChanges(changes: SimpleChanges) {
        if ('dropdownOpen' in changes) {
            if (this.dropdownOpen) {
                this.show()
            } else {
                this.hide()
            }
        }
    }

    private show() {
        if (this.overlayRef) return

        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(this.appDropdownMenu)
            .withPositions(this.dropdownPositions)

        this.overlayRef = this.overlay.create({
            positionStrategy,
            hasBackdrop: true,
            backdropClass: 'cdk-overlay-transparent-backdrop'
        })

        this.overlayRef.backdropClick().subscribe(() => this.dropdownClosed.emit())
        this.overlayRef.detachments().subscribe(() => this.dropdownClosed.emit())
        this.overlayRef.attach(new TemplatePortal(this.templateRef, this.viewContainerRef))
    }

    private hide() {
        if (this.overlayRef) {
            this.overlayRef.dispose()
            this.overlayRef = null
        }
    }

    ngOnDestroy() {
        this.hide()
    }
}
