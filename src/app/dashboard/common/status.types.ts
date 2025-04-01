export type ComputationState = 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'

export type ComputationStateInfo = {
    state: ComputationState
    message: string
}
