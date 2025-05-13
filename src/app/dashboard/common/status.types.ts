export type ComputationState = 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'

export type ComputationFlags = ('NEW' | 'ARCHIVED' | 'DEMO')[]

export type ComputationStateInfo = {
    state: ComputationState
    message: string
}
