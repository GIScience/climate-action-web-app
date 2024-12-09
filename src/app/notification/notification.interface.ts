// Unused for now, will restore once the websocket is re-enabled.

export interface WSMessage {
    type: string
    timestamp: string
    correlation_uuid?: string
    message?: string
    status?: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE'
}

