import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useURLState } from '@/hooks/useURLState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EventTable } from '@/components/EventTable'
import { api } from '@/lib/api'
import { 
  Tags, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react'
import { useState } from 'react'

export function EventSearch() {
  const { tags: urlTags } = useParams()
  
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="h-8 w-8" />
          Event Search
        </h1>
        <p className="text-muted-foreground mt-2">
          Search and filter events by type, tags, and position in UmaDB
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

          {data.events.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No events found matching the search criteria.
              </CardContent>
            </Card>
          ) : (
            <div>
              <div className="mb-4 text-sm text-muted-foreground">
                Events are ordered by their position in the global event stream.
              </div>
              <EventTable 
                events={data.events}
                hasMore={data.has_more}
                canLoadPrevious={Number(start) > 0}
                onLoadNext={loadNext}
                onLoadPrevious={loadPrevious}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}