import {
  EventReadResponse,
  EventGetResponse,
  PingResponse,
} from '../types.js'

const API_BASE = '/api'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`)
  }
  
  return response.json()
}

export const api = {
  async ping(): Promise<{ result: PingResponse }> {
    return fetchApi('/ping')
  },

  async getEvent(eventId: string): Promise<EventGetResponse> {
    return fetchApi(`/events/${encodeURIComponent(eventId)}`)
  },

  async readEvents(
    eventTypes?: string[],
    tags?: string[],
    start?: number,
    backwards: boolean = false,
    limit: number = 100
  ): Promise<EventReadResponse> {
    const params = new URLSearchParams()
    
    if (eventTypes && eventTypes.length > 0) {
      params.set('event_types', eventTypes.join(','))
    }
    
    if (tags && tags.length > 0) {
      params.set('tags', tags.join(','))
    }
    
    if (start !== undefined) {
      params.set('start', start.toString())
    }
    
    if (backwards) {
      params.set('backwards', 'true')
    }
    
    if (limit !== 100) {
      params.set('limit', limit.toString())
    }
    
    return fetchApi(`/events?${params}`)
  },
}

export { ApiError }