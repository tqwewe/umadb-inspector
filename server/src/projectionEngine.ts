import ivm from 'isolated-vm'
import { UmaDBClient } from './umadb.js'
import { ProjectionProgress, UmaDBEvent } from './types.js'
import { processEventFields } from './binaryUtils.js'

export class ProjectionEngine {
  private umaDB: UmaDBClient
  private abortController: AbortController | null = null

  constructor(umaDB: UmaDBClient) {
    this.umaDB = umaDB
  }

  async runProjection(
    code: string,
    initialState: any = null,
    onProgress: (progress: ProjectionProgress) => void,
    eventTypes?: string[],
    tags?: string[]
  ): Promise<void> {
    this.abortController = new AbortController()
    
    try {
      // Initialize the isolated VM context
      const isolate = new ivm.Isolate({ memoryLimit: 128 })
      const context = isolate.createContextSync()
      const jail = context.global
      
      // Set up the projection function in the isolated context
      jail.setSync('global', jail.derefInto())

      // Compile and run the user's projection code with simplified console
      const script = isolate.compileScriptSync(`
        // Simple console implementation
        const console = {
          log: function(...args) { /* no-op for now */ },
          error: function(...args) { /* no-op for now */ },
          warn: function(...args) { /* no-op for now */ }
        };
        
        ${code}
        
        // Ensure the project function exists
        if (typeof project !== 'function') {
          throw new Error('Projection code must define a "project" function');
        }
      `)
      
      script.runSync(context)
      
      let currentState = initialState
      let eventsProcessed = 0
      
      // Report initial progress
      onProgress({
        events_processed: 0,
        current_state: currentState,
        status: 'running'
      })

      // Read events from UmaDB with filtering
      const readParams = {
        event_types: eventTypes,
        tags: tags,
        start: 1, // Start from beginning
        backwards: false,
        limit: 1000 // Process in batches
      }

      let hasMore = true
      let currentPosition = 1
      
      while (hasMore && !this.abortController.signal.aborted) {
        const readResult = await this.umaDB.readEvents({
          ...readParams,
          start: currentPosition
        })
        
        if (!readResult || readResult.events.length === 0) {
          break
        }

        // Process each event through the projection
        for (const event of readResult.events) {
          if (this.abortController.signal.aborted) {
            throw new Error('Projection aborted')
          }
          
          try {
            // Create a safe event object to pass to the projection
            const safeEvent = {
              uuid: event.uuid || null,
              event_type: event.event_type || '',
              tags: Array.isArray(event.tags) ? event.tags : [],
              position: Number(event.position) || 0,
              data: event.data || null,
              data_parsed: event.data_parsed || null
            }
            
            // Use a much simpler approach - set values as strings and parse inside VM
            jail.setSync('stateJson', JSON.stringify(currentState))
            jail.setSync('eventJson', JSON.stringify(safeEvent))
            
            // Execute projection function without redeclaring variables
            const result = context.evalSync(`
              (function() {
                const state = JSON.parse(stateJson);
                const event = JSON.parse(eventJson);
                const result = project(state, event);
                return JSON.stringify(result);
              })();
            `, { timeout: 5000 })
            
            currentState = JSON.parse(result)
            eventsProcessed++
            
            // Report progress every 100 events
            if (eventsProcessed % 100 === 0) {
              onProgress({
                events_processed: eventsProcessed,
                current_state: currentState,
                status: 'running'
              })
            }
          } catch (error) {
            const errorMessage = `Error processing event ${event.uuid || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`
            onProgress({
              events_processed: eventsProcessed,
              current_state: currentState,
              status: 'error',
              error: errorMessage
            })
            throw new Error(errorMessage)
          }
        }
        
        // Check if there are more events
        hasMore = readResult.has_more
        if (hasMore && readResult.events.length > 0) {
          // Update position for next batch
          currentPosition = readResult.events[readResult.events.length - 1].position + 1
        }
      }
      
      // Final progress report
      onProgress({
        events_processed: eventsProcessed,
        current_state: currentState,
        status: 'completed'
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // Only report error if it wasn't already reported by the inner catch
      if (!errorMessage.includes('Error processing event')) {
        onProgress({
          events_processed: 0,
          current_state: initialState,
          status: 'error',
          error: errorMessage
        })
      }
      throw error
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }
}