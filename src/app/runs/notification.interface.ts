export interface WSComputationStatus {
    type: 'computation_status'
    correlation_uuid: string
    status: 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'wrong-input',
    message?: string
    timestamp: string
}

export interface WSHeartbeat {
    type: 'heartbeat'
    timestamp: string
}

export type WSMessage = WSHeartbeat | WSComputationStatus
