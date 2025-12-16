import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { 
  Database, 
  Search, 
  Eye,
  Calculator,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'

export function Home() {
  const { data: pingResult, isLoading, error } = useQuery({
    queryKey: ['ping'],
    queryFn: () => api.ping(),
    refetchInterval: 30000,
  })

  const isConnected = pingResult?.result === 'PONG'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">UmaDB Inspector</h1>
        <p className="text-muted-foreground mt-2">
          Search and explore events in your UmaDB event store
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking connection...</span>
              </>
            ) : isConnected ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-700">Connected to UmaDB</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-700">
                  {error ? `Connection failed: ${error.message}` : 'Not connected'}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Event Search
            </CardTitle>
            <CardDescription>
              Search and filter events by type, tags, position, and direction in the global stream
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/search">Search Events</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Event Lookup
            </CardTitle>
            <CardDescription>
              Look up specific events by their unique identifier (UUID)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/events">Lookup Events</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Projections
            </CardTitle>
            <CardDescription>
              Run custom JavaScript projections to analyze and aggregate events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/projections">Run Projections</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About UmaDB</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            UmaDB is an event store database that implements the Dynamic Consistency Boundaries 
            specification. Events are stored in a single global stream and can be queried by 
            event type and tags for flexible event filtering and aggregation.
          </p>
          <ul className="mt-4 space-y-2">
            <li><strong>Event Types:</strong> Logical categorization of events (e.g., UserCreated, OrderPlaced)</li>
            <li><strong>Tags:</strong> Arbitrary string labels for flexible event filtering</li>
            <li><strong>Global Stream:</strong> Single ordered sequence of all events with position numbers</li>
            <li><strong>UUIDs:</strong> Unique identifiers for individual event lookup</li>
            <li><strong>Projections:</strong> JavaScript functions that process events to build aggregated state for analytics</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}