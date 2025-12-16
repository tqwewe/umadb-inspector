import { z } from 'zod';
export declare const UmaDBEventSchema: z.ZodObject<{
    uuid: z.ZodString;
    event_type: z.ZodString;
    tags: z.ZodArray<z.ZodString, "many">;
    position: z.ZodNumber;
    timestamp: z.ZodNumber;
    data: z.ZodNullable<z.ZodString>;
    data_encoding: z.ZodNullable<z.ZodString>;
    data_parsed: z.ZodNullable<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    uuid: string;
    event_type: string;
    tags: string[];
    position: number;
    timestamp: number;
    data: string | null;
    data_encoding: string | null;
    data_parsed?: any;
}, {
    uuid: string;
    event_type: string;
    tags: string[];
    position: number;
    timestamp: number;
    data: string | null;
    data_encoding: string | null;
    data_parsed?: any;
}>;
export declare const EventReadResponseSchema: z.ZodObject<{
    has_more: z.ZodBoolean;
    events: z.ZodArray<z.ZodObject<{
        uuid: z.ZodString;
        event_type: z.ZodString;
        tags: z.ZodArray<z.ZodString, "many">;
        position: z.ZodNumber;
        timestamp: z.ZodNumber;
        data: z.ZodNullable<z.ZodString>;
        data_encoding: z.ZodNullable<z.ZodString>;
        data_parsed: z.ZodNullable<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        uuid: string;
        event_type: string;
        tags: string[];
        position: number;
        timestamp: number;
        data: string | null;
        data_encoding: string | null;
        data_parsed?: any;
    }, {
        uuid: string;
        event_type: string;
        tags: string[];
        position: number;
        timestamp: number;
        data: string | null;
        data_encoding: string | null;
        data_parsed?: any;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    has_more: boolean;
    events: {
        uuid: string;
        event_type: string;
        tags: string[];
        position: number;
        timestamp: number;
        data: string | null;
        data_encoding: string | null;
        data_parsed?: any;
    }[];
}, {
    has_more: boolean;
    events: {
        uuid: string;
        event_type: string;
        tags: string[];
        position: number;
        timestamp: number;
        data: string | null;
        data_encoding: string | null;
        data_parsed?: any;
    }[];
}>;
export declare const EventGetResponseSchema: z.ZodNullable<z.ZodObject<{
    uuid: z.ZodString;
    event_type: z.ZodString;
    tags: z.ZodArray<z.ZodString, "many">;
    position: z.ZodNumber;
    timestamp: z.ZodNumber;
    data: z.ZodNullable<z.ZodString>;
    data_encoding: z.ZodNullable<z.ZodString>;
    data_parsed: z.ZodNullable<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    uuid: string;
    event_type: string;
    tags: string[];
    position: number;
    timestamp: number;
    data: string | null;
    data_encoding: string | null;
    data_parsed?: any;
}, {
    uuid: string;
    event_type: string;
    tags: string[];
    position: number;
    timestamp: number;
    data: string | null;
    data_encoding: string | null;
    data_parsed?: any;
}>>;
export declare const PingResponseSchema: z.ZodString;
export type UmaDBEvent = z.infer<typeof UmaDBEventSchema>;
export type EventReadResponse = z.infer<typeof EventReadResponseSchema>;
export type EventGetResponse = z.infer<typeof EventGetResponseSchema>;
export type PingResponse = z.infer<typeof PingResponseSchema>;
export interface EventReadParams {
    event_types?: string[];
    tags?: string[];
    start?: number;
    backwards?: boolean;
    limit?: number;
    batch_size?: number;
}
export interface EventGetParams {
    event_id: string;
}
