import { z } from 'zod'

// UmaDB-specific server types with additional encoding info
export const UmaDBEventSchema = z.object({
  uuid: z.string().nullable(),
  event_type: z.string(),
  tags: z.array(z.string()),
  position: z.number(),
  data: z.any().nullable(),
  data_encoding: z.enum(['base64-cbor', 'base64-binary', 'json']).nullable().optional(),
  data_parsed: z.any().nullable().optional(),
})

export const EventReadResponseSchema = z.object({
  has_more: z.boolean(),
  events: z.array(UmaDBEventSchema),
})

export const EventGetResponseSchema = UmaDBEventSchema.nullable()
export const PingResponseSchema = z.string()

export type UmaDBEvent = z.infer<typeof UmaDBEventSchema>
export type EventReadResponse = z.infer<typeof EventReadResponseSchema>
export type EventGetResponse = z.infer<typeof EventGetResponseSchema>
export type PingResponse = z.infer<typeof PingResponseSchema>

export interface EventReadParams {
  event_types?: string[]
  tags?: string[]
  start?: number
  backwards?: boolean
  limit?: number
  batch_size?: number
}

export interface EventGetParams {
  event_id: string
}

export const ProjectionRunRequestSchema = z.object({
  code: z.string().min(1, 'Projection code is required'),
  initialState: z.any().optional(),
  eventTypes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

export const ProjectionProgressSchema = z.object({
  events_processed: z.number(),
  total_events_estimated: z.number().optional(),
  current_state: z.any(),
  status: z.enum(['running', 'completed', 'error']),
  error: z.string().optional(),
})

export type ProjectionRunRequest = z.infer<typeof ProjectionRunRequestSchema>
export type ProjectionProgress = z.infer<typeof ProjectionProgressSchema>

// Debug Session Types
export const DebugSessionStartRequestSchema = z.object({
  code: z.string().min(1, 'Projection code is required'),
  initialState: z.any().optional(),
  eventTypes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

export const DebugStepRequestSchema = z.object({
  sessionId: z.string(),
})

export const DebugSessionStatusSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['idle', 'running', 'paused', 'completed', 'error']),
  currentPartition: z.number(),
  currentEventIndex: z.number(),
  totalEventsLoaded: z.number(),
  currentState: z.any(),
  currentEvent: UmaDBEventSchema.nullable(),
  previousState: z.any().nullable(),
  consoleLogs: z.array(z.object({
    timestamp: z.number(),
    level: z.enum(['log', 'warn', 'error']),
    message: z.string(),
  })),
  error: z.string().optional(),
})

export const DebugStepResponseSchema = z.object({
  sessionStatus: DebugSessionStatusSchema,
  stateChanged: z.boolean(),
  processingComplete: z.boolean(),
})

export type DebugSessionStartRequest = z.infer<typeof DebugSessionStartRequestSchema>
export type DebugStepRequest = z.infer<typeof DebugStepRequestSchema>
export type DebugSessionStatus = z.infer<typeof DebugSessionStatusSchema>
export type DebugStepResponse = z.infer<typeof DebugStepResponseSchema>
