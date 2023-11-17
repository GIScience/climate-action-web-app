export interface WSMessageResponse {
    correlation_uuid: string
    status: 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'wrong-input',
    message?: string
    timestamp: string
}
