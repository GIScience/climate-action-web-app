interface PlotlyLocale {
    moduleType: 'locale'
    name: string
    dictionary: Record<string, string>
    format: {
        days: string[]
        shortDays: string[]
        months: string[]
        shortMonths: string[]
        date: string
        decimal: string
        thousands: string
        year: string
        month: string
        dayMonth: string
        dayMonthYear: string
    }
}

declare module 'plotly.js-locales/de' {
    const locale: PlotlyLocale
    export default locale
}

declare module 'plotly.js-locales/en' {
    const locale: PlotlyLocale
    export default locale
}
