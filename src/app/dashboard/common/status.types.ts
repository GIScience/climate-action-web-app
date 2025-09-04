export type ComputationRunState = 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'

export type ComputationItemState = 'ACTIVE' | 'ARCHIVED' | 'DELETED'

export type ComputationFlags = ('NEW' | 'DEMO' | 'IMPORTED' | 'ARCHIVED')[]

export type ComputationRunStateInfo = {
    state: ComputationRunState
    message: string
}
