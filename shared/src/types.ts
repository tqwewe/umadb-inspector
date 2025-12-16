import { z } from 'zod'

export const UmaDBEventSchema = z.object({
  uuid: z.string().nullable(),
  event_type: z.string(),
  tags: z.array(z.string()),
  position: z.number(),
  data: z.string().nullable(),
  data_encoding: z.string().nullable(),
  data_parsed: z.any().nullable(),
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