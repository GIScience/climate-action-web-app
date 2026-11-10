export type ComputationRunState = 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'

export type ComputationFlags = ('NEW' | 'CUSTOM_AOI')[]

export type ComputationRunStateInfo = {
    state: ComputationRunState
    message: string
}
