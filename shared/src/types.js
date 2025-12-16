import { z } from 'zod';
export const UmaDBEventSchema = z.object({
    uuid: z.string(),
    event_type: z.string(),
    tags: z.array(z.string()),
    position: z.number(),
    timestamp: z.number(),
    data: z.string().nullable(),
    data_encoding: z.string().nullable(),
    data_parsed: z.any().nullable(),
});
export const EventReadResponseSchema = z.object({
    has_more: z.boolean(),
    events: z.array(UmaDBEventSchema),
});
export const EventGetResponseSchema = UmaDBEventSchema.nullable();
export const PingResponseSchema = z.string();
