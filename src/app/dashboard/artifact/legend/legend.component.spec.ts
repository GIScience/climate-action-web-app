import { CommonModule } from '@angular/common'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LegendComponent } from './legend.component'

function rgbToHex(rgb: string): string {
    const rgbValues = rgb.match(/\d+/g)
    if (!rgbValues || rgbValues.length !== 3) return rgb

    const r = parseInt(rgbValues[0]).toString(16).padStart(2, '0')
    const g = parseInt(rgbValues[1]).toString(16).padStart(2, '0')
    const b = parseInt(rgbValues[2]).toString(16).padStart(2, '0')

    return `#${r}${g}${b}`
}

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
            const colorBox = item.query(By.css('.legend-color-box')).nativeElement
            const bgColor = window.getComputedStyle(colorBox).backgroundColor
            expect(rgbToHex(bgColor)).toBe(expectedColors[index])
            expect(item.nativeElement.textContent.trim()).toContain(expectedNames[index])
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
        expect(canvas.attributes['id']).toBe('canvas_seismic')

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

    it('should add unit to title', () => {
        component.legendData = {
            title: 'Test Title',
            unit: 'm/s',
            legend_type: 'CONTINUOUS',
            legend_data: {
                cmap_name: 'seismic',
                ticks: { 'Low b': 0.0, 'Mid c': 0.5, 'High a': 1.0 }
            }
        }

        fixture.detectChanges()

        const title = fixture.debugElement.query(By.css('.title')).nativeElement
        expect(title).toBeTruthy()
        expect(title.textContent.trim()).toBe('Test Title (m/s)')
    })
})
