import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing'
import { provideCharts, withDefaultRegisterables } from 'ng2-charts'
import { ChartData } from '../artifact.interface'
import { ChartComponent } from './chart.component'

jest.mock('chart.js', () => {
    const mockChart = {
        destroy: jest.fn(),
        update: jest.fn(),
        render: jest.fn()
    }

    const Chart = jest.fn().mockImplementation(() => mockChart) as jest.Mock & {
        register: jest.Mock
    }
    Chart.register = jest.fn()

    return {
        Chart,
        registerables: [],
        defaults: {
            set: jest.fn()
        }
    }
})

describe('ChartComponent', () => {
    let component: ChartComponent
    let fixture: ComponentFixture<ChartComponent>

    beforeEach(() => {
        const mockContext = {
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            fill: jest.fn(),
            arc: jest.fn(),
            closePath: jest.fn(),
            clearRect: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            translate: jest.fn(),
            scale: jest.fn(),
            rotate: jest.fn()
        }

        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext)

        TestBed.configureTestingModule({
            imports: [ChartComponent],
            providers: [provideCharts(withDefaultRegisterables())]
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
        if (fixture) {
            fixture.destroy()
        }
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should inject a line chart', fakeAsync(() => {
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

        expect(component.chartCanvas).toBeTruthy()
        expect(component.chartCanvas?.nativeElement).toBeTruthy()
    }))

    it('should inject a pie chart', fakeAsync(() => {
        component.inputData = {
            data: {
                x: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90],
                y: [
                    0, -19.898249567923347, -39.54900636404743, -56.54716731139922, -67.45528394951128,
                    -76.82166400869163, -97.6826509195305, -124.8035106238136, -88.21904514284847, -149.56140749594064
                ],
                chart_type: 'PIE',
                color: '#590d08'
            } as ChartData,
            artifact: null
        }

        component.ngOnInit()
        fixture.detectChanges()
        tick(1)

        expect(component.chartCanvas).toBeTruthy()
        expect(component.chartCanvas?.nativeElement).toBeTruthy()
    }))
})
