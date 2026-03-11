import { CommonModule } from '@angular/common'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LegendComponent } from './legend.component'

describe('LegendComponent', () => {
    let component: LegendComponent
    let fixture: ComponentFixture<LegendComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CommonModule, LegendComponent]
        }).compileComponents()

        fixture = TestBed.createComponent(LegendComponent)
        component = fixture.componentInstance
    })

    it('should render discrete legend correctly', () => {
        component.legendData = {
            legend_type: 'DISCRETE',
            legend_data: { 'Black b': '#000000', 'Green c': '#00ff00', 'Red a': '#ff0000' }
        }

        fixture.detectChanges()

        const legendContainer = fixture.debugElement.query(By.css('.discrete-legend'))
        expect(legendContainer).toBeTruthy()

        const legendItems = legendContainer.queryAll(By.css('li'))
        expect(legendItems.length).toBe(3)

        const expectedColors = ['#000000', '#00ff00', '#ff0000']
        const expectedNames = ['Black B', 'Green C', 'Red A']

        legendItems.forEach((item, index) => {
            const staticItem = item.query(By.css('.static-legend-item')).nativeElement
            expect(staticItem.style.getPropertyValue('--legend-color')).toBe(expectedColors[index])
            expect(staticItem.textContent.trim()).toContain(expectedNames[index])
        })
    })

    it('should render continuous legend correctly', () => {
        component.legendData = {
            legend_type: 'CONTINUOUS',
            legend_data: {
                cmap_name: 'seismic',
                ticks: { 'Low b': 0.0, 'Mid c': 0.5, 'High a': 1.0 }
            }
        }

        fixture.detectChanges()

        const legendContainer = fixture.debugElement.query(By.css('.continuous-legend'))
        expect(legendContainer).toBeTruthy()

        const canvas = legendContainer.query(By.css('canvas'))
        expect(canvas).toBeTruthy()

        const ticksContainer = legendContainer.query(By.css('.ticks'))
        const ticks = ticksContainer.queryAll(By.css('span'))
        expect(ticks.length).toBe(3)

        const expectedTicks = [
            { name: 'Low B', position: '0%' },
            { name: 'Mid C', position: '50%' },
            { name: 'High A', position: '100%' }
        ]

        ticks.forEach((tick, index) => {
            expect(tick.nativeElement.style.bottom).toBe(expectedTicks[index].position)
            expect(tick.nativeElement.textContent.trim()).toContain(expectedTicks[index].name)
        })
    })

    it('should have a title', () => {
        component.legendData = {
            title: 'Test Title',
            legend_type: 'CONTINUOUS',
            legend_data: {
                cmap_name: 'seismic',
                ticks: { 'Low b': 0.0, 'Mid c': 0.5, 'High a': 1.0 }
            }
        }

        fixture.detectChanges()

        const title = fixture.debugElement.query(By.css('.title')).nativeElement
        expect(title).toBeTruthy()
        expect(title.textContent.trim()).toBe('Test Title')
    })

    it('should render checkboxes when onHiddenCategoriesChange is provided', () => {
        component.legendData = {
            legend_type: 'DISCRETE',
            legend_data: { forest: '#00ff00', water: '#0000ff' }
        }
        component.onHiddenCategoriesChange = jest.fn()
        fixture.detectChanges()

        const checkboxes = fixture.debugElement.queryAll(By.css('.legend-checkbox'))
        expect(checkboxes.length).toBe(2)
        checkboxes.forEach(cb => {
            expect(cb.nativeElement.checked).toBe(true)
        })
    })

    it('should call onHiddenCategoriesChange with hidden categories when a checkbox is toggled', () => {
        const toggleSpy = jest.fn()
        component.legendData = {
            legend_type: 'DISCRETE',
            legend_data: { forest: '#00ff00', water: '#0000ff', urban: '#888888' }
        }
        component.onHiddenCategoriesChange = toggleSpy
        fixture.detectChanges()

        const checkboxes = fixture.debugElement.queryAll(By.css('.legend-checkbox'))
        // Uncheck 'water' (second item)
        checkboxes[1].nativeElement.click()
        fixture.detectChanges()

        expect(toggleSpy).toHaveBeenCalledWith(['water'])
    })

    it('should add dimmed class to unchecked items', () => {
        component.legendData = {
            legend_type: 'DISCRETE',
            legend_data: { forest: '#00ff00', water: '#0000ff' }
        }
        component.onHiddenCategoriesChange = jest.fn()
        fixture.detectChanges()

        const checkboxes = fixture.debugElement.queryAll(By.css('.legend-checkbox'))
        // Uncheck 'forest' (first item)
        checkboxes[0].nativeElement.click()
        fixture.detectChanges()

        const items = fixture.debugElement.queryAll(By.css('li'))
        expect(items[0].nativeElement.classList.contains('dimmed')).toBe(true)
        expect(items[1].nativeElement.classList.contains('dimmed')).toBe(false)
    })

    it('should generate legend-scoped checkbox ids from artifact id', () => {
        const firstFixture = TestBed.createComponent(LegendComponent)
        firstFixture.componentInstance.legendData = {
            legend_type: 'DISCRETE',
            legend_data: { 'urban area': '#ff0000' }
        }
        firstFixture.componentInstance.artifactId = 'artifact-1'
        firstFixture.componentInstance.onHiddenCategoriesChange = () => {}
        firstFixture.detectChanges()

        const secondFixture = TestBed.createComponent(LegendComponent)
        secondFixture.componentInstance.legendData = {
            legend_type: 'DISCRETE',
            legend_data: { 'urban area': '#00ff00' }
        }
        secondFixture.componentInstance.artifactId = 'artifact-2'
        secondFixture.componentInstance.onHiddenCategoriesChange = () => {}
        secondFixture.detectChanges()

        const firstInput: HTMLInputElement = firstFixture.debugElement.query(By.css('.legend-checkbox')).nativeElement
        const firstLabel: HTMLLabelElement = firstFixture.debugElement.query(By.css('label')).nativeElement
        const secondInput: HTMLInputElement = secondFixture.debugElement.query(By.css('.legend-checkbox')).nativeElement
        const secondLabel: HTMLLabelElement = secondFixture.debugElement.query(By.css('label')).nativeElement

        expect(firstInput.id).toBe(firstLabel.htmlFor)
        expect(secondInput.id).toBe(secondLabel.htmlFor)
        expect(firstInput.id).not.toBe(secondInput.id)
    })

    it('should generate unique checkbox ids even without artifact id', () => {
        const firstFixture = TestBed.createComponent(LegendComponent)
        firstFixture.componentInstance.legendData = {
            legend_type: 'DISCRETE',
            legend_data: { 'urban area': '#ff0000' }
        }
        firstFixture.componentInstance.onHiddenCategoriesChange = () => {}
        firstFixture.detectChanges()

        const secondFixture = TestBed.createComponent(LegendComponent)
        secondFixture.componentInstance.legendData = {
            legend_type: 'DISCRETE',
            legend_data: { 'urban area': '#00ff00' }
        }
        secondFixture.componentInstance.onHiddenCategoriesChange = () => {}
        secondFixture.detectChanges()

        const firstInput: HTMLInputElement = firstFixture.debugElement.query(By.css('.legend-checkbox')).nativeElement
        const secondInput: HTMLInputElement = secondFixture.debugElement.query(By.css('.legend-checkbox')).nativeElement

        expect(firstInput.id).not.toBe(secondInput.id)
    })
})
