import { environment } from '@environments/environment'

export function formatTimestamp(date: Date, locale: string): string {
    return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

// Appends the maintenance window to a schedule's name: "Name (start → end)",
// just "Name (start)" with no end time, or just "Name" with no window at all.
export function formatScheduleTitle(name: string, locale: string, start?: Date, end?: Date): string {
    if (!start) return name
    const window = end
        ? `${formatTimestamp(start, locale)} → ${formatTimestamp(end, locale)}`
        : formatTimestamp(start, locale)
    return `${name} (${window})`
}

// A schedule is relevant while it's ongoing or due to start within the configured lookahead
// window: past its planned end it's dropped, and with no start time it's always shown.
export function isWithinLookaheadWindow(start?: Date, end?: Date): boolean {
    const now = new Date()
    if (end && end < now) return false
    if (!start) return true
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() + parseInt(environment.scheduleLookaheadDays))
    return start <= cutoff
}
