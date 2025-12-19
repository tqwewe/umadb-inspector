export interface UmaDBEvent {
  uuid: string | null
  event_type: string
  tags: string[]
  position: number
  data: string | null
  data_encoding?: 'base64-cbor' | 'base64-binary' | 'json' | null
  data_parsed?: any
}

export interface EventReadResponse {
  has_more: boolean
  events: UmaDBEvent[]
}

export type EventGetResponse = UmaDBEvent | null

export type PingResponse = string

export interface ProjectionRunRequest {
  code: string
  initialState?: any
  eventTypes?: string[]
  tags?: string[]
}

export interface ProjectionProgress {
  events_processed: number
  total_events_estimated?: number
  current_state: any
  status: 'running' | 'completed' | 'error'
  error?: string
}

// Debug Session Types
export interface DebugSessionStartRequest {
  code: string
  initialState?: any
  eventTypes?: string[]
  tags?: string[]
}

export interface DebugStepRequest {
  sessionId: string
}

export interface ConsoleLog {
  timestamp: number
  level: 'log' | 'warn' | 'error'
  message: string
}

export interface DebugSessionStatus {
  sessionId: string
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  currentPartition: number
  currentEventIndex: number
  totalEventsLoaded: number
  currentState: any
  currentEvent: UmaDBEvent | null
  previousState: any | null
  consoleLogs: ConsoleLog[]
  error?: string
}

export interface DebugStepResponse {
  sessionStatus: DebugSessionStatus
  stateChanged: boolean
  processingComplete: boolean
}

// Saved Projections Types
export interface SavedProjection {
  id: string
  name: string
  code: string
  description?: string
  createdAt: string // ISO date string for localStorage compatibility
  updatedAt: string
  eventTypes?: string[] // for event type filtering
  tags?: string[] // for tag filtering
  renderMode: 'json' | 'html' // how to display results
  htmlTemplate?: string // optional custom HTML template
  category?: string // for organization
}

export interface SavedProjectionResult {
  projectionId: string
  result: any
  status: 'completed' | 'error' | 'running'
  error?: string
  lastRun: string // ISO date string
  eventsProcessed?: number
}

export type RenderTemplate = 'list' | 'stats' | 'table' | 'collection' | 'custom' | 'auto'

export interface HTMLRenderConfig {
  template: RenderTemplate
  customTemplate?: string
  title?: string
  description?: string
}