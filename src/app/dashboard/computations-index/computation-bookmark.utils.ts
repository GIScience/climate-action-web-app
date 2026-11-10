import { TranslocoService } from '@jsverse/transloco'
import { AOI_ORIGINAL_TYPES, ExternalInput } from '../plugin/plugin.interface'
import { parseUtcTimestamp } from './computation-format.utils'
import { ComputationDatabaseEntity, ComputationDisplayEntity } from './computation.interface'

type BookmarkedComputation = Pick<ComputationDisplayEntity, 'flags' | 'geometry' | 'valid_until'>

function isCustomAoi(computation: BookmarkedComputation): boolean {
    if (computation.flags?.includes('CUSTOM_AOI')) return true

    // Older boundary computations lack original_type entirely,
    // so absence counts as a boundary.
    const originalType = computation.geometry?.properties?.['original_type']
    return !!originalType && originalType !== AOI_ORIGINAL_TYPES[ExternalInput.Boundary]
}

// A missing or unreadable valid_until counts as expired
export function isExpired(validUntil?: Date | string | null): boolean {
    return !(validUntil && parseUtcTimestamp(validUntil).getTime() > Date.now())
}

export function confirmUnbookmark(computation: BookmarkedComputation, translocoService: TranslocoService): boolean {
    const ask = (key: string) => confirm(translocoService.translate(`computationsIndex.${key}`))

    if (isCustomAoi(computation)) return ask('unbookmarkCustomAoiConfirm')
    if (isExpired(computation.valid_until)) return ask('unbookmarkExpiredConfirm')
    return true
}

export function toBookmarkEntity(computation: ComputationDisplayEntity): ComputationDatabaseEntity {
    return {
        correlation_uuid: computation.correlation_uuid,
        request_ts: computation.request_ts,
        status: 'SUCCESS',
        aoiName: computation.aoiName,
        pluginId: computation.pluginId,
        language: computation.language,
        valid_until: computation.valid_until
    }
}
