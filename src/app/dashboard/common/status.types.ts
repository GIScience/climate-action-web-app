export type ComputationRunState = 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'

export type ComputationItemState = 'ACTIVE' | 'ARCHIVED' | 'DELETED'

export type ComputationFlags = ('NEW' | 'IMPORTED' | 'ARCHIVED' | 'CUSTOM_AOI')[]

export type ComputationRunStateInfo = {
    state: ComputationRunState
    message: string
}
