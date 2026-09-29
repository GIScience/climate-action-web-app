import { ComputationRunState } from './status.types'

const STATUS_RANK: { [status: string]: number } = {
    PENDING: 0,
    RETRY: 1,
    STARTED: 1,
    SUCCESS: 2,
    FAILURE: 2,
    REVOKED: 2
}

export function statusRank(status: string): number {
    return STATUS_RANK[status] ?? 0
}

export function isPendingStatus(status: ComputationRunState): boolean {
    return status === 'PENDING' || status === 'STARTED'
}
