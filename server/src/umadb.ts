import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import {
  UmaDBEvent,
  EventReadResponse,
  EventReadParams,
  EventGetResponse,
  EventGetParams,
  PingResponse,
  UmaDBEventSchema,
  EventReadResponseSchema,
  EventGetResponseSchema,
  PingResponseSchema,
} from './types.js'
import { processEventFields } from './binaryUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface UmaDBServiceClient extends grpc.Client {
  Read: (request: any) => grpc.ClientReadableStream<any>
  Head: (request: any, callback: grpc.requestCallback<any>) => void
}

export class UmaDBClient {
  private client: UmaDBServiceClient | null = null
  private url: string
  private isConnecting: boolean = false

  constructor(url: string = 'localhost:50051') {
    this.url = url
  }

  private async loadProtoDefinition() {
    // In development, use the source proto file. In production, it should be in the same directory as the compiled JS
    const isDev = process.env.NODE_ENV !== 'production'
    const protoPath = isDev 
      ? join(__dirname, 'umadb.proto')
      : join(__dirname, 'umadb.proto')
    
    const packageDefinition = await protoLoader.load(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    })

    return grpc.loadPackageDefinition(packageDefinition) as any
  }

  async connect(): Promise<void> {
    if (this.client) {
      return
    }

    this.isConnecting = true
    
    try {
      const proto = await this.loadProtoDefinition()
      const DCBService = proto.umadb.v1.DCB

      this.client = new DCBService(
        this.url,
        grpc.credentials.createInsecure()
      ) as UmaDBServiceClient

      // Test connection
      await this.ping()
      console.log('Connected to UmaDB')
      this.isConnecting = false
    } catch (error) {
      this.isConnecting = false
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close()
      this.client = null
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client && !this.isConnecting) {
      console.log('Connection lost, attempting to reconnect...')
      try {
        await this.connect()
      } catch (error) {
        console.error('Failed to reconnect:', error)
        throw error
      }
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      await this.ensureConnected()
      return await operation()
    } catch (error: any) {
      if (error.code === grpc.status.UNAVAILABLE || error.code === grpc.status.DEADLINE_EXCEEDED) {
        console.log('Connection error detected, retrying...')
        await this.ensureConnected()
        return await operation()
      }
      throw error
    }
  }

  async ping(): Promise<PingResponse> {
    return await this.executeWithRetry(async () => {
      if (!this.client) {
        throw new Error('Client not connected')
      }

      return new Promise<PingResponse>((resolve, reject) => {
        this.client!.Head({}, (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            reject(error)
          } else {
            resolve(PingResponseSchema.parse('PONG'))
          }
        })
      })
    })
  }

  async getEvent(params: EventGetParams): Promise<EventGetResponse> {
    return await this.executeWithRetry(async () => {
      if (!this.client) {
        throw new Error('Client not connected')
      }

      // Create a query to find the specific event by UUID
      const query = {
        items: [{
          types: [], // Empty means all types
          tags: []   // Empty means all tags
        }]
      }

      const request = {
        query: query,
        start: 0,
        backwards: false,
        limit: 1000000, // Large limit to search through all events
        subscribe: false,
        batch_size: 1000
      }

      return new Promise<EventGetResponse>((resolve, reject) => {
        const stream = this.client!.Read(request)
        let found = false

        stream.on('data', (response: any) => {
          if (response.events) {
            for (const sequencedEvent of response.events) {
              if (sequencedEvent.event?.uuid && sequencedEvent.event.uuid === params.event_id) {
                const processedFields = processEventFields(null, sequencedEvent.event?.data || null)
                
                const event = {
                  uuid: sequencedEvent.event.uuid || null,
                  event_type: sequencedEvent.event.event_type,
                  tags: sequencedEvent.event.tags || [],
                  position: Number(sequencedEvent.position),
                  data: processedFields.payload,
                  data_encoding: processedFields.payload_encoding,
                  data_parsed: processedFields.payload_parsed,
                }

                found = true
                resolve(EventGetResponseSchema.parse(event))
                return
              }
            }
          }
        })

        stream.on('end', () => {
          if (!found) {
            resolve(null)
          }
        })

        stream.on('error', (error: any) => {
          reject(error)
        })
      })
    })
  }

  async readEvents(params: EventReadParams): Promise<EventReadResponse> {
    return await this.executeWithRetry(async () => {
      if (!this.client) {
        throw new Error('Client not connected')
      }

      const query = {
        items: [{
          types: params.event_types || [],
          tags: params.tags || []
        }]
      }

      const request = {
        query: query,
        start: params.start || 0,
        backwards: params.backwards || false,
        limit: params.limit || 100,
        subscribe: false,
        batch_size: params.batch_size || 100
      }

      return new Promise<EventReadResponse>((resolve, reject) => {
        const stream = this.client!.Read(request)
        const events: UmaDBEvent[] = []
        let hasMore = false

        stream.on('data', (response: any) => {
          if (response.events) {
            for (const sequencedEvent of response.events) {
              const processedFields = processEventFields(null, sequencedEvent.event?.data || null)
              
              const event = {
                uuid: sequencedEvent.event.uuid || null,
                event_type: sequencedEvent.event.event_type,
                tags: sequencedEvent.event.tags || [],
                position: Number(sequencedEvent.position),
                data: processedFields.payload,
                data_encoding: processedFields.payload_encoding,
                data_parsed: processedFields.payload_parsed,
              }

              events.push(UmaDBEventSchema.parse(event))
            }
          }
        })

        stream.on('end', () => {
          // Check if we got the full limit - if so, there might be more
          hasMore = events.length === (params.limit || 100)
          
          resolve(EventReadResponseSchema.parse({
            has_more: hasMore,
            events: events
          }))
        })

        stream.on('error', (error: any) => {
          reject(error)
        })
      })
    })
  }
}