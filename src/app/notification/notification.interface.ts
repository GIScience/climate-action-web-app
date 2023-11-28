export interface WSMessage {
    type: string
    timestamp: string
    correlation_uuid?: string
    message?: string
    status?: 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'wrong-input',
}

