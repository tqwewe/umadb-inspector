import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useURLState } from '@/hooks/useURLState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EventTable } from '@/components/EventTable'
import { HTMLRenderer } from '@/components/HTMLRenderer'
import { api } from '@/lib/api'
import { 
  Tags, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  BarChart3,
  Table,
  Clock,
  GitBranch,
  Activity
} from 'lucide-react'
import { useState, useMemo } from 'react'

export function EventSearch() {
  const { tags: urlTags } = useParams()
  const navigate = useNavigate()
  
  const [state, updateState] = useURLState({
    tags: urlTags || '',
    eventTypes: '',
    start: '1',
    backwards: 'false',
    limit: ''
  })
  
  const { tags, eventTypes, start, backwards, limit } = state
  const [newTag, setNewTag] = useState('')
  const [newEventType, setNewEventType] = useState('')
  
  // Visualization mode state
  const [viewMode, setViewMode] = useState<'table' | 'visualize'>('table')
  const [visualizationType, setVisualizationType] = useState<'timeline' | 'flow' | 'heatmap' | 'stats'>('timeline')
  
  // Separate query state that only updates on explicit search
  const [queryState, setQueryState] = useState({
    tags: '',
    eventTypes: '',
    start: '1',
    backwards: 'false',
    limit: ''
  })
  
  const tagList = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : []
  const eventTypeList = eventTypes ? eventTypes.split(',').map(t => t.trim()).filter(t => t) : []
  
  const queryTagList = queryState.tags ? queryState.tags.split(',').map(t => t.trim()).filter(t => t) : []
  const queryEventTypeList = queryState.eventTypes ? queryState.eventTypes.split(',').map(t => t.trim()).filter(t => t) : []
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['events-by-tags', queryState.tags, queryState.eventTypes, queryState.start, queryState.backwards, queryState.limit],
    queryFn: () => api.readEvents(
      queryEventTypeList.length > 0 ? queryEventTypeList : undefined,
      queryTagList.length > 0 ? queryTagList : undefined,
      queryState.start === '' ? undefined : Number(queryState.start),
      queryState.backwards === 'true',
      queryState.limit && queryState.limit !== '' ? Number(queryState.limit) : 100
    ),
    enabled: false, // Disable automatic queries
  })

  const handleSearch = () => {
    // Update query state with current input values and trigger search
    setQueryState({
      tags,
      eventTypes,
      start,
      backwards,
      limit
    })
    // Use setTimeout to ensure state is updated before refetch
    setTimeout(() => refetch(), 0)
  }

  const addTag = () => {
    if (newTag.trim()) {
      const newTags = [...tagList, newTag.trim()]
      updateState({ tags: newTags.join(',') })
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    const newTags = tagList.filter(tag => tag !== tagToRemove)
    updateState({ tags: newTags.join(',') })
  }

  const addEventType = () => {
    if (newEventType.trim()) {
      const newTypes = [...eventTypeList, newEventType.trim()]
      updateState({ eventTypes: newTypes.join(',') })
      setNewEventType('')
    }
  }

  const removeEventType = (typeToRemove: string) => {
    const newTypes = eventTypeList.filter(type => type !== typeToRemove)
    updateState({ eventTypes: newTypes.join(',') })
  }

  const loadNext = () => {
    if (data?.events.length && data.has_more) {
      const lastEvent = data.events[data.events.length - 1]
      const newStart = (lastEvent.position + 1).toString()
      const newBackwards = 'false'
      
      updateState({
        start: newStart,
        backwards: newBackwards
      })
      
      setQueryState({
        tags,
        eventTypes,
        start: newStart,
        backwards: newBackwards,
        limit
      })
      
      // Manually trigger search after state update
      setTimeout(() => refetch(), 0)
    }
  }

  const loadPrevious = () => {
    if (data?.events.length) {
      const firstEvent = data.events[0]
      const prevPosition = Math.max(0, firstEvent.position - Number(limit))
      const newStart = Math.max(1, prevPosition).toString()
      const newBackwards = 'false'
      
      updateState({
        start: newStart,
        backwards: newBackwards
      })
      
      setQueryState({
        tags,
        eventTypes,
        start: newStart,
        backwards: newBackwards,
        limit
      })
      
      // Manually trigger search after state update
      setTimeout(() => refetch(), 0)
    }
  }

  const resetToLatest = () => {
    const newStart = '1'
    const newBackwards = 'false'
    
    updateState({
      start: newStart,
      backwards: newBackwards
    })
    
    setQueryState({
      tags,
      eventTypes,
      start: newStart,
      backwards: newBackwards,
      limit
    })
    
    // Manually trigger search after state update
    setTimeout(() => refetch(), 0)
  }

  // Process events for visualization
  const processedVisualizationData = useMemo(() => {
    if (!data?.events || data.events.length === 0) return null

    const events = data.events

    switch (visualizationType) {
      case 'timeline': {
        // Build timeline data structure - try to detect grouping dimension
        const groups: Record<string, any> = {}
        const eventTypes = new Set<string>()
        let minPosition = Infinity
        let maxPosition = -Infinity

        // Try to find a good grouping dimension from tags or use event types
        let groupingDimension = 'event_type' // fallback to event types
        let hasUserTags = false
        let hasOtherGroupingTags = false

        // Analyze tags to find a good grouping dimension
        events.forEach(event => {
          if (event.tags) {
            event.tags.forEach(tag => {
              if (tag.startsWith('user:') || tag.startsWith('userId:')) {
                hasUserTags = true
              } else if (tag.includes(':') && !tag.startsWith('system:') && !tag.startsWith('event:')) {
                hasOtherGroupingTags = true
              }
            })
          }
        })

        if (hasUserTags) {
          groupingDimension = 'user'
        } else if (hasOtherGroupingTags) {
          groupingDimension = 'tag_group'
        }

        events.forEach(event => {
          let groupId = 'All Events'

          if (groupingDimension === 'user' && event.tags) {
            const userTag = event.tags.find(tag => tag.startsWith('user:') || tag.startsWith('userId:'))
            if (userTag) {
              groupId = userTag.split(':')[1] || 'Unknown User'
            } else {
              groupId = 'No User'
            }
          } else if (groupingDimension === 'tag_group' && event.tags) {
            // Use first meaningful tag as group
            const meaningfulTag = event.tags.find(tag => tag.includes(':') && !tag.startsWith('system:'))
            if (meaningfulTag) {
              const [prefix] = meaningfulTag.split(':')
              groupId = prefix
            }
          } else if (groupingDimension === 'event_type') {
            groupId = event.event_type
          }

          if (!groups[groupId]) {
            groups[groupId] = {
              events: [],
              firstSeen: event.position,
              lastSeen: event.position,
              eventCount: 0,
              uniqueEventTypes: []
            }
          }

          groups[groupId].events.push({
            position: event.position,
            timestamp: new Date().toISOString(),
            type: event.event_type,
            tags: event.tags || [],
            data: event.data_parsed,
            uuid: event.uuid
          })

          groups[groupId].lastSeen = Math.max(groups[groupId].lastSeen, event.position)
          groups[groupId].eventCount++
          
          eventTypes.add(event.event_type)
          minPosition = Math.min(minPosition, event.position)
          maxPosition = Math.max(maxPosition, event.position)
        })

        // Convert to arrays
        Object.values(groups).forEach((group: any) => {
          group.uniqueEventTypes = [...new Set(group.events.map((e: any) => e.type))]
        })

        return {
          users: groups, // Keep the 'users' key for component compatibility
          timeRange: { start: minPosition, end: maxPosition },
          eventTypes: Array.from(eventTypes),
          totalEvents: events.length,
          groupingDimension // Add info about how data is grouped
        }
      }

      case 'flow': {
        // Build flow analysis data
        const transitions: Record<string, any> = {}
        const eventFrequency: Record<string, number> = {}
        const nodes = new Set<string>()
        let totalTransitions = 0

        // Sort all events by position and create sequential transitions
        const sortedEvents = [...events].sort((a, b) => a.position - b.position)
        
        sortedEvents.forEach(event => {
          eventFrequency[event.event_type] = (eventFrequency[event.event_type] || 0) + 1
          nodes.add(event.event_type)
        })

        // Find transitions in the sequential event stream
        for (let i = 1; i < sortedEvents.length; i++) {
          const fromEvent = sortedEvents[i - 1]
          const toEvent = sortedEvents[i]
          
          // Only create transitions between nearby events (within reasonable position distance)
          const positionGap = toEvent.position - fromEvent.position
          if (positionGap <= 1000) { // Adjust this threshold as needed
            const transitionKey = `${fromEvent.event_type} → ${toEvent.event_type}`
            
            if (!transitions[transitionKey]) {
              transitions[transitionKey] = {
                from: fromEvent.event_type,
                to: toEvent.event_type,
                count: 0,
                users: new Set()
              }
            }
            
            transitions[transitionKey].count++
            
            // Try to extract any identifier for grouping
            let identifier = 'event-stream'
            if (fromEvent.tags) {
              const identifierTag = fromEvent.tags.find(tag => tag.includes(':'))
              if (identifierTag) {
                identifier = identifierTag.split(':')[0]
              }
            }
            transitions[transitionKey].users.add(identifier)
            totalTransitions++
          }
        }

        // Convert Sets to arrays
        Object.values(transitions).forEach((t: any) => {
          t.users = Array.from(t.users)
        })

        return {
          transitions,
          eventFrequency,
          nodes: Array.from(nodes),
          totalTransitions
        }
      }

      case 'heatmap': {
        // Build activity heatmap data
        const hourlyActivity: Record<number, number> = {}
        const dailyActivity: Record<string, number> = {}
        const weeklyActivity: Record<number, Record<number, number>> = {}
        const eventTypeActivity: Record<string, any> = {}

        // Initialize weekly grid
        for (let day = 0; day < 7; day++) {
          weeklyActivity[day] = {}
          for (let hour = 0; hour < 24; hour++) {
            weeklyActivity[day][hour] = 0
          }
        }

        events.forEach(event => {
          // Use position as time proxy with some randomness for demo
          const fakeTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          const hour = fakeTime.getHours()
          const dayOfWeek = fakeTime.getDay()
          const dayKey = fakeTime.toISOString().split('T')[0]

          hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1
          dailyActivity[dayKey] = (dailyActivity[dayKey] || 0) + 1
          weeklyActivity[dayOfWeek][hour]++

          if (!eventTypeActivity[event.event_type]) {
            eventTypeActivity[event.event_type] = {
              hourly: {},
              daily: {},
              total: 0
            }
          }

          const typeActivity = eventTypeActivity[event.event_type]
          typeActivity.hourly[hour] = (typeActivity.hourly[hour] || 0) + 1
          typeActivity.daily[dayKey] = (typeActivity.daily[dayKey] || 0) + 1
          typeActivity.total++
        })

        return {
          hourlyActivity,
          dailyActivity,
          weeklyActivity,
          eventTypeActivity,
          totalEvents: events.length
        }
      }

      case 'stats': {
        // Build statistics data
        const eventsByType: Record<string, number> = {}
        const tagCounts: Record<string, number> = {}
        const tagPrefixes: Record<string, number> = {}
        let positionRange = { min: Infinity, max: -Infinity }

        events.forEach(event => {
          eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1
          
          if (event.tags) {
            event.tags.forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1
              
              // Count tag prefixes for grouping insights
              if (tag.includes(':')) {
                const prefix = tag.split(':')[0]
                tagPrefixes[prefix] = (tagPrefixes[prefix] || 0) + 1
              }
            })
          }

          positionRange.min = Math.min(positionRange.min, event.position)
          positionRange.max = Math.max(positionRange.max, event.position)
        })

        // Calculate some derived metrics
        const uniqueEventTypes = Object.keys(eventsByType).length
        const totalTags = Object.keys(tagCounts).length
        const tagPrefixCount = Object.keys(tagPrefixes).length
        const avgEventsPerType = uniqueEventTypes > 0 ? events.length / uniqueEventTypes : 0
        const mostCommonEventType = Object.entries(eventsByType).sort(([,a], [,b]) => b - a)[0]
        const mostCommonTag = Object.entries(tagCounts).sort(([,a], [,b]) => b - a)[0]

        return {
          totalEvents: events.length,
          uniqueEventTypes,
          totalTags,
          tagPrefixCount,
          eventsByType,
          tagCounts,
          tagPrefixes,
          positionRange,
          timeSpan: positionRange.max - positionRange.min,
          avgEventsPerType,
          mostCommonEventType: mostCommonEventType ? mostCommonEventType[0] : 'N/A',
          mostCommonEventTypeCount: mostCommonEventType ? mostCommonEventType[1] : 0,
          mostCommonTag: mostCommonTag ? mostCommonTag[0] : 'N/A',
          mostCommonTagCount: mostCommonTag ? mostCommonTag[1] : 0
        }
      }

      default:
        return null
    }
  }, [data?.events, visualizationType])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="h-8 w-8" />
          Event Search & Visualization
        </h1>
        <p className="text-muted-foreground mt-2">
          Search, filter, and visualize events by type, tags, and position in UmaDB
        </p>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
          <CardDescription>
            Filter events by type and tags. Leave filters empty to search all events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Tags Section */}
            <div>
              <h4 className="font-medium mb-3">Tags</h4>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a tag (e.g., user:123, order:pending)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1"
                  />
                  <Button onClick={addTag} disabled={!newTag.trim()}>
                    Add Tag
                  </Button>
                </div>
                
                {tagList.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tagList.map((tag, index) => (
                      <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                        <span>{tag}</span>
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Event Types Section */}
            <div>
              <h4 className="font-medium mb-3">Event Types</h4>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter an event type (e.g., UserCreated, OrderPlaced)"
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addEventType()}
                    className="flex-1"
                  />
                  <Button onClick={addEventType} disabled={!newEventType.trim()}>
                    Add Type
                  </Button>
                </div>
                
                {eventTypeList.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {eventTypeList.map((type, index) => (
                      <div key={index} className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm">
                        <span>{type}</span>
                        <button
                          onClick={() => removeEventType(type)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Search Button */}
            <div className="flex gap-2">
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search Events
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {(tagList.length > 0 || eventTypeList.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Search Parameters</CardTitle>
            <CardDescription>
              Configure position, direction, and limit for the search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">Start Position</label>
                <Input
                  placeholder="1 (beginning)"
                  value={start}
                  onChange={(e) => updateState({ start: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Direction</label>
                <select
                  value={backwards}
                  onChange={(e) => updateState({ backwards: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="false">Forward</option>
                  <option value="true">Backwards</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Limit</label>
                <Input
                  placeholder="100"
                  value={limit}
                  onChange={(e) => updateState({ limit: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleSearch} className="flex-1">
                  Search
                </Button>
                <Button onClick={resetToLatest} variant="outline" size="sm">
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading events...</span>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Error: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Search Results
              <span className="text-sm text-muted-foreground ml-2">
                ({data.events.length} events{data.has_more ? ', more available' : ''})
              </span>
            </h2>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 mr-4">
                <Button
                  variant={viewMode === 'table' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="px-3"
                >
                  <Table className="h-4 w-4 mr-1" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'visualize' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode('visualize')}
                  className="px-3"
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Visualize
                </Button>
              </div>

              {/* Visualization Type Selector */}
              {viewMode === 'visualize' && (
                <div className="flex items-center gap-1 mr-4">
                  <Button
                    variant={visualizationType === 'timeline' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVisualizationType('timeline')}
                    className="px-2 text-xs"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Timeline
                  </Button>
                  <Button
                    variant={visualizationType === 'flow' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVisualizationType('flow')}
                    className="px-2 text-xs"
                  >
                    <GitBranch className="h-3 w-3 mr-1" />
                    Flow
                  </Button>
                  <Button
                    variant={visualizationType === 'heatmap' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVisualizationType('heatmap')}
                    className="px-2 text-xs"
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    Heatmap
                  </Button>
                  <Button
                    variant={visualizationType === 'stats' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVisualizationType('stats')}
                    className="px-2 text-xs"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Stats
                  </Button>
                </div>
              )}
              
              {/* Pagination Controls */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={loadPrevious}
                  disabled={!data.events.length || Number(start) <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  onClick={loadNext}
                  disabled={!data.has_more}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          {data.events.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No events found matching the search criteria.
              </CardContent>
            </Card>
          ) : (
            <div>
              {viewMode === 'table' ? (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">
                    Events are ordered by their position in the global event stream.
                  </div>
                  <EventTable 
                    events={data.events}
                    hasMore={data.has_more}
                    canLoadPrevious={Number(start) > 0}
                    onLoadNext={loadNext}
                    onLoadPrevious={loadPrevious}
                    onEventNavigate={(eventId) => {
                      navigate(`/events/${eventId}`)
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">
                    Interactive visualization of {data.events.length} events. {data.has_more ? 'Load more events for broader analysis.' : ''}
                  </div>
                  {processedVisualizationData ? (
                    <HTMLRenderer 
                      data={processedVisualizationData}
                      title={`Event ${visualizationType.charAt(0).toUpperCase() + visualizationType.slice(1)} Analysis`}
                      description={`${visualizationType.charAt(0).toUpperCase() + visualizationType.slice(1)} view of search results with ${data.events.length} events`}
                    />
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Unable to generate visualization for the selected type.</p>
                        <p className="text-xs mt-2">Try a different visualization type or check if events contain the required data.</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}