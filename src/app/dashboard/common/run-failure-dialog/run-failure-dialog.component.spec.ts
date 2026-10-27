import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { By } from '@angular/platform-browser'
import { Mock } from 'vitest'
import { getTranslocoTestingModule } from '../../../../testing/test-helpers'
import { RunFailureDialogComponent, RunFailureDialogData } from './run-failure-dialog.component'

describe('RunFailureDialogComponent', () => {
    let fixture: ComponentFixture<RunFailureDialogComponent>
    let mockDialogRef: { close: Mock }
    let writeText: Mock

    const baseData: RunFailureDialogData = {
        revoked: false,
        pluginName: 'Heat',
        aoiName: 'Heidelberg',
        correlationUuid: 'abc-123',
        mailto: 'mailto:support@example.org'
    }

    async function setup(data: Partial<RunFailureDialogData> = {}): Promise<void> {
        mockDialogRef = { close: vi.fn() }
        writeText = vi.fn()
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

        await TestBed.configureTestingModule({
            imports: [RunFailureDialogComponent, getTranslocoTestingModule()],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { ...baseData, ...data } },
                { provide: MatDialogRef, useValue: mockDialogRef }
            ]
        }).compileComponents()

        fixture = TestBed.createComponent(RunFailureDialogComponent)
        fixture.detectChanges()
    }

    it('should show the revoked title and the failure message when given', async () => {
        await setup({ revoked: true, message: 'service busy' })

        expect(fixture.debugElement.query(By.css('h3')).nativeElement.textContent).toContain('revokedTitle')
        expect(fixture.debugElement.query(By.css('.run-failure-dialog__message')).nativeElement.textContent).toBe(
            'service busy'
        )
    })

    it('should copy the computation id to the clipboard', async () => {
        await setup()

        fixture.debugElement.query(By.css('.run-failure-dialog__id button')).triggerEventHandler('click', null)

        expect(writeText).toHaveBeenCalledWith('abc-123')
        expect(fixture.componentInstance.copied()).toBe(true)
    })
})
