import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { getTranslocoTestingModule } from '../../../../../jest.mocks'
import {
    ComputationParametersDialogComponent,
    ComputationParametersDialogData
} from './computation-parameters-dialog.component'

describe('ComputationParametersDialogComponent', () => {
    let fixture: ComponentFixture<ComputationParametersDialogComponent>
    let mockDialogRef: { close: jest.Mock }

    async function setup(data: ComputationParametersDialogData): Promise<void> {
        mockDialogRef = { close: jest.fn() }

        await TestBed.configureTestingModule({
            imports: [ComputationParametersDialogComponent, NoopAnimationsModule, getTranslocoTestingModule()],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: mockDialogRef }
            ]
        }).compileComponents()

        fixture = TestBed.createComponent(ComputationParametersDialogComponent)
        fixture.detectChanges()
    }

    it('should render a row per parameter with formatted names and values', async () => {
        await setup({ params: { enabled: true, max_value: 3 } })

        const rows = fixture.debugElement.queryAll(By.css('.parameters-table tr'))
        expect(rows.length).toBe(2)
        expect(rows[0].query(By.css('.parameter-name')).nativeElement.textContent).toBe('Enabled')
        expect(rows[0].query(By.css('.parameter-value')).nativeElement.textContent).toBe('Yes')
        expect(rows[1].query(By.css('.parameter-name')).nativeElement.textContent).toBe('Max Value')
        expect(rows[1].query(By.css('.parameter-value')).nativeElement.textContent).toBe('3')
    })

    it('should highlight user-requested parameters and show the legend', async () => {
        await setup({ params: { foo: 1, bar: 2 }, requestedParams: { bar: 2 } })

        expect(fixture.debugElement.query(By.css('.parameters-legend'))).toBeTruthy()

        const rows = fixture.debugElement.queryAll(By.css('.parameters-table tr'))
        expect(rows[0].classes['user-defined']).toBeFalsy()
        expect(rows[1].classes['user-defined']).toBe(true)
    })

    it('should show the empty message when there are no parameters', async () => {
        await setup({ params: {} })

        expect(fixture.debugElement.query(By.css('.parameters-table'))).toBeFalsy()
        expect(fixture.debugElement.query(By.css('.no-params-message'))).toBeTruthy()
    })

    it('should close the dialog from the close button', async () => {
        await setup({ params: {} })

        fixture.debugElement.query(By.css('.close-dialog')).triggerEventHandler('click', null)

        expect(mockDialogRef.close).toHaveBeenCalled()
    })
})
