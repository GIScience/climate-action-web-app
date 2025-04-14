/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Remove this file once the types are updated for plotly.js v3
declare module 'plotly.js-cartesian-dist' {
    interface PlotlyHTMLElement extends HTMLElement {
        _fullLayout: any
        _fullData: any
    }

    export interface PlotlyInstance {
        data: Data[]
        layout: Layout
        config: any
    }

    interface PlotlyStatic {
        newPlot(element: HTMLElement, data: Data[], layout: Layout, config?: any): Promise<PlotlyInstance>
        purge(element: HTMLElement): void
    }

    export interface Data {
        type?: string
        x?: any[]
        y?: any[]
        mode?: string
        name?: string
        [key: string]: any
    }

    export interface Layout {
        title?: string
        xaxis?: any
        yaxis?: any
        [key: string]: any
    }

    const Plotly: PlotlyStatic
    export default Plotly
}
