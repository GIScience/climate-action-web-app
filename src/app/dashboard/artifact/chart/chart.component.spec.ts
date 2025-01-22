import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing'
import {ChartComponent} from './chart.component'
import {NgChartsModule} from 'ng2-charts'
import {ChartData} from '../artifact.interface'

describe('BarChartComponent', () => {
    let component: ChartComponent
    let fixture: ComponentFixture<ChartComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NgChartsModule],
            declarations: [ChartComponent]
        }).compileComponents()

        fixture = TestBed.createComponent(ChartComponent)
        component = fixture.componentInstance

        component.inputData = {
            data: null,
            artifact: null
        }

        fixture.detectChanges()
    })

    afterEach(() => {
        fixture.destroy()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should inject a line chart', fakeAsync(() => {
        const initialDataURL = component.chartCanvas?.nativeElement.toDataURL('image/png')

        component.inputData = {
            data: {
                x: [0],
                y: [1],
                chart_type: 'LINE',
                color: '#590d08'
            } as ChartData,
            artifact: null
        }

        component.ngOnInit()
        fixture.detectChanges()

        tick(1)

        expect(component.chartCanvas?.nativeElement.toDataURL('image/png')).not
            .toEqual(initialDataURL)
    }))

    it('should inject a pie chart', fakeAsync(() => {
        const initialDataURL = component.chartCanvas?.nativeElement.toDataURL('image/png')

        component.inputData = {
            data: {
                x: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90],
                y: [0, -19.898249567923347, -39.54900636404743, -56.54716731139922, -67.45528394951128, -76.82166400869163,
                    -97.6826509195305, -124.8035106238136, -88.21904514284847, -149.56140749594064],
                chart_type: 'PIE',
                color: '#590d08'
            } as ChartData,
            artifact: null
        }

        component.ngOnInit()
        fixture.detectChanges()

        tick(1)

        expect(component.chartCanvas?.nativeElement.toDataURL('image/png')).not
            .toEqual(initialDataURL)
    }))
})

