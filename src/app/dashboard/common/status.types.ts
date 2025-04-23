export type ComputationState = 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'

export type ComputationFlag = 'NEW' | 'ARCHIVED' | null

export type ComputationStateInfo = {
    state: ComputationState
    message: string
}
