import { environment } from '@environments/environment'

export function formatTimestamp(date: Date, locale: string): string {
    return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

function timeZoneAbbreviation(date: Date, locale: string): string {
    return (
        new Intl.DateTimeFormat(locale, { timeZoneName: 'short' })
            .formatToParts(date)
            .find(part => part.type === 'timeZoneName')?.value ?? ''
    )
}

// Appends the maintenance window to a schedule's name: "Name (start → end timezone)",
// just "Name (start timezone)" with no end time, or just "Name" with no window at all.
export function formatScheduleTitle(name: string, locale: string, start?: Date, end?: Date): string {
    if (!start) return name
    const timeZone = timeZoneAbbreviation(end ?? start, locale)
    let window = end
        ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).formatRange(start, end)
        : formatTimestamp(start, locale)
    if (timeZone) window += ` ${timeZone}`
    return `${name}\n(${window})`
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
