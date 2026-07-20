export type ToastLevel = 'info' | 'warning' | 'error'

export interface StatusNotice {
    level: ToastLevel
    title: string
    message: string
    link?: string // Only for incidents
}
