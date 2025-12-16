import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { UmaDBClient } from './umadb.js'
import {
  EventReadParams,
  EventGetParams,
  ProjectionRunRequestSchema,
} from './types.js'
import { ProjectionEngine } from './projectionEngine.js'

const app = express()
const port = process.env.PORT || 3001
const umaDBUrl = process.env.UMADB_URL || 'localhost:50051'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.use(cors())
app.use(express.json())

// Serve static files from the client build directory
const clientDistPath = join(__dirname, '../../client/dist')
app.use(express.static(clientDistPath))

const umaDB = new UmaDBClient(umaDBUrl)
const projectionEngine = new ProjectionEngine(umaDB)

const EventReadQuerySchema = z.object({
  event_types: z.string().optional().transform(val => {
    if (!val) return undefined
    return val.split(',').map(t => t.trim()).filter(t => t.length > 0)
  }),
  tags: z.string().optional().transform(val => {
    if (!val) return undefined
    return val.split(',').map(t => t.trim()).filter(t => t.length > 0)
  }),
  start: z.string().optional().transform(val => {
    if (!val) return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }),
  backwards: z.string().optional().transform(val => val === 'true'),
  limit: z.string().optional().transform(val => {
    if (!val) return undefined
    const num = Number(val)
    return isNaN(num) ? 100 : num
  }),
})

const EventGetParamsSchema = z.object({
  event_id: z.string(),
})

app.get('/api/ping', async (req, res) => {
  try {
    const result = await umaDB.ping()
    res.json({ result })
  } catch (error) {
    console.error('Ping error:', error)
    res.status(500).json({ error: 'Failed to ping UmaDB' })
  }
})

app.get('/api/events', async (req, res) => {
  try {
    const queryParams = EventReadQuerySchema.parse(req.query)
    const result = await umaDB.readEvents(queryParams)
    res.json(result)
  } catch (error) {
    console.error('Event read error:', error)
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid parameters', details: error.errors })
    } else {
      res.status(500).json({ error: 'Failed to read events' })
    }
  }
})

app.get('/api/events/:event_id', async (req, res) => {
  try {
    const params = EventGetParamsSchema.parse(req.params)
    const result = await umaDB.getEvent(params)
    res.json(result)
  } catch (error) {
    console.error('Get event error:', error)
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid parameters', details: error.errors })
    } else {
      res.status(500).json({ error: 'Failed to get event' })
    }
  }
})

app.post('/api/projections/run', async (req, res) => {
  try {
    const params = ProjectionRunRequestSchema.parse(req.body)
    
    // Set up Server-Sent Events headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    })

    // Send initial connection event
    res.write('event: connected\n')
    res.write('data: {"status": "connected"}\n\n')
    
    // Flush the response to ensure it's sent immediately
    res.flushHeaders()

    // Run the projection (await it properly)
    try {
      await projectionEngine.runProjection(
        params.code,
        params.initialState || null,
        (progress) => {
          res.write('event: progress\n')
          res.write(`data: ${JSON.stringify(progress)}\n\n`)
          
          // Close connection when completed or error
          if (progress.status === 'completed' || progress.status === 'error') {
            res.end()
          }
        },
        params.eventTypes,
        params.tags
      )
    } catch (projectionError) {
      console.error('Projection execution error:', projectionError)
      res.write('event: progress\n')
      res.write(`data: ${JSON.stringify({
        events_processed: 0,
        current_state: null,
        status: 'error',
        error: projectionError instanceof Error ? projectionError.message : 'Unknown projection error'
      })}\n\n`)
      res.end()
    }

    // Handle client disconnect
    req.on('close', () => {
      projectionEngine.abort()
      res.end()
    })

  } catch (error) {
    console.error('Projection run error:', error)
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid parameters', details: error.errors })
    } else {
      res.status(500).json({ error: 'Failed to start projection' })
    }
  }
})

// Catch-all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(clientDistPath, 'index.html'))
})

async function startServer() {
  try {
    console.log(`Starting server on port ${port}`)
    console.log(`Attempting to connect to UmaDB at: ${umaDBUrl}`)
    
    await umaDB.connect()
    console.log('Successfully connected to UmaDB')

    app.listen(port, () => {
      console.log(`UmaDB Inspector server running on port ${port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    console.error('Error details:', error)
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  console.log('Shutting down...')
  await umaDB.disconnect()
  process.exit(0)
})

startServer()
