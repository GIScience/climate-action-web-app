export enum IncidentStatus {
    Reported = 0,
    Investigating = 1,
    Identified = 2,
    Watching = 3,
    Fixed = 4
}

export enum ScheduleStatus {
    Upcoming = 0,
    InProgress = 1,
    Complete = 2
}

export interface CachetSchedule {
    attributes: {
        name: string
        message: string
        status: { value: ScheduleStatus }
        scheduled?: { string: string | null }
        completed?: { string: string | null }
    }
    relationships?: {
        components?: { data: { id: string }[] }
    }
}

export interface CachetIncident {
    attributes: {
        guid: string
        name: string
        message: string
        status: { value: IncidentStatus }
    }
    relationships?: {
        components?: { data: { id: string }[] }
    }
}

export type CachetAnnouncement = CachetSchedule | CachetIncident

export interface CachetComponent {
    id: string
    type: string
    attributes: { name: string }
    relationships?: { group?: { data?: { id: string } } }
}

export interface CachetComponentGroup {
    id: string
    type: string
    attributes: { name: string }
}

export type CachetIncluded = CachetComponent | CachetComponentGroup

export interface CachetListResponse<T extends CachetAnnouncement> {
    data: T[]
    included?: CachetIncluded[]
}
