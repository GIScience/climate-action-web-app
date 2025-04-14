import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Artifact } from '../artifact.interface'
import { PlotlyChartComponent } from './plotly-chart.component'

describe('PlotlyChartComponent', () => {
    let component: PlotlyChartComponent
    let fixture: ComponentFixture<PlotlyChartComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PlotlyChartComponent]
        }).compileComponents()

        fixture = TestBed.createComponent(PlotlyChartComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should handle input data correctly', () => {
        const mockData = {
            data: {
                data: [{ type: 'scatter', x: [1, 2, 3], y: [4, 5, 6] }],
                layout: { title: 'Test Chart' }
            },
            artifact: {
                name: 'Test Chart',
                modality: 'CHART_PLOTLY',
                primary: true,
                file_path: 'test.json',
                correlation_uuid: '123',
                store_id: '456',
                attachments: {}
            } as Artifact
        }

        component.inputData = mockData
        component.ngOnInit()

        expect(component.plotlyData).toEqual(mockData.data.data)
        expect(component.plotlyLayout).toEqual(mockData.data.layout)
    })

    it('should handle null input data', () => {
        component.inputData = { data: null, artifact: null }
        component.ngOnInit()

        expect(component.plotlyData).toBeNull()
        expect(component.plotlyLayout).toBeNull()
    })
})
