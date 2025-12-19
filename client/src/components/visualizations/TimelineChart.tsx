import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Users,
  Activity,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp 
} from 'lucide-react'

interface TimelineEvent {
  position: number
  timestamp: string
  type: string
  tags: string[]
  data?: any
  uuid?: string
}

interface UserData {
  events: TimelineEvent[]
  firstSeen: number
  lastSeen: number
  eventCount: number
  uniqueEventTypes: string[]
}

interface TimelineData {
  users: Record<string, UserData>
  timeRange: { start: number; end: number }
  eventTypes: string[]
  totalEvents: number
}

interface TimelineChartProps {
  data: TimelineData & { groupingDimension?: string }
  title?: string
  description?: string
  width?: number
  height?: number
}

export function TimelineChart({ 
  data, 
  title = "Event Timeline Analysis", 
  description = "Interactive timeline showing event patterns and activity over time",
  width = 1000,
  height = 600 
}: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [zoomLevel, setZoomLevel] = useState(1)
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent & { userId: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filteredEventTypes, setFilteredEventTypes] = useState<string[]>(data.eventTypes)

  // Color scale for event types
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(data.eventTypes)

  // Get top users by activity for initial display
  const topUsers = Object.entries(data.users)
    .sort(([,a], [,b]) => b.eventCount - a.eventCount)
    .slice(0, 10)
    .map(([userId]) => userId)

  const displayUsers = selectedUsers.length > 0 ? selectedUsers : topUsers

  useEffect(() => {
    if (!svgRef.current || !data.users) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove() // Clear previous render

    const margin = { top: 60, right: 40, bottom: 60, left: 120 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Create main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Scales
    const xScale = d3.scaleLinear()
      .domain([data.timeRange.start, data.timeRange.end])
      .range([0, innerWidth])

    const yScale = d3.scaleBand()
      .domain(displayUsers)
      .range([0, innerHeight])
      .padding(0.1)

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        const { transform } = event
        setZoomLevel(transform.k)
        
        // Update x scale based on zoom
        const newXScale = transform.rescaleX(xScale)
        
        // Update events
        g.selectAll(".event-circle")
          .attr("cx", (d: any) => newXScale(d.position))
        
        // Update x-axis
        g.select(".x-axis")
          .call(d3.axisBottom(newXScale)
            .tickFormat(d => `Pos ${d}`))
      })

    svg.call(zoom)

    // X-axis
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `Pos ${d}`))

    // Y-axis
    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale))

    // Add swimlanes
    g.selectAll(".swimlane")
      .data(displayUsers)
      .enter().append("rect")
      .attr("class", "swimlane")
      .attr("x", 0)
      .attr("y", d => yScale(d)!)
      .attr("width", innerWidth)
      .attr("height", yScale.bandwidth())
      .attr("fill", (_, i) => i % 2 === 0 ? "#f8f9fa" : "#ffffff")
      .attr("stroke", "#e9ecef")
      .attr("stroke-width", 0.5)

    // Add events as circles
    displayUsers.forEach(userId => {
      const userEvents = data.users[userId]?.events.filter(event => 
        filteredEventTypes.includes(event.type)
      ) || []

      g.selectAll(`.event-${userId}`)
        .data(userEvents)
        .enter().append("circle")
        .attr("class", `event-circle event-${userId}`)
        .attr("cx", d => xScale(d.position))
        .attr("cy", d => yScale(userId)! + yScale.bandwidth() / 2)
        .attr("r", 4)
        .attr("fill", d => colorScale(d.type))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
          setHoveredEvent({ ...d, userId })
          d3.select(event.target).attr("r", 6)
        })
        .on("mouseout", (event) => {
          setHoveredEvent(null)
          d3.select(event.target).attr("r", 4)
        })
        .append("title")
        .text(d => `${d.type} at position ${d.position}`)
    })

    // Add legend
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${innerWidth - 150}, 20)`)

    const legendItems = legend.selectAll(".legend-item")
      .data(data.eventTypes.slice(0, 8)) // Limit legend items
      .enter().append("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => `translate(0, ${i * 18})`)

    legendItems.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 4)
      .attr("fill", d => colorScale(d))

    legendItems.append("text")
      .attr("x", 10)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .text(d => d.length > 15 ? d.substring(0, 15) + "..." : d)

  }, [data, displayUsers, filteredEventTypes, width, height])

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      // @ts-ignore
      svg.property("__zoom").scaleBy, 1.5
    )
  }

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      // @ts-ignore
      svg.property("__zoom").scaleBy, 1 / 1.5
    )
  }

  const handleReset = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      // @ts-ignore
      svg.property("__zoom").transform,
      d3.zoomIdentity
    )
    setZoomLevel(1)
  }

  const toggleEventType = (eventType: string) => {
    setFilteredEventTypes(prev => 
      prev.includes(eventType) 
        ? prev.filter(type => type !== eventType)
        : [...prev, eventType]
    )
  }

  // Get generic labels based on grouping dimension
  const getGroupLabel = () => {
    switch (data.groupingDimension) {
      case 'user': return 'Users'
      case 'tag_group': return 'Groups'
      case 'event_type': return 'Event Types'
      default: return 'Groups'
    }
  }

  const getAvgLabel = () => {
    switch (data.groupingDimension) {
      case 'user': return 'Avg Events/User'
      case 'tag_group': return 'Avg Events/Group'
      case 'event_type': return 'Avg Events/Type'
      default: return 'Avg Events/Group'
    }
  }

  const groupStats = displayUsers.length > 0 ? {
    totalGroups: displayUsers.length,
    totalEvents: displayUsers.reduce((sum, userId) => sum + (data.users[userId]?.eventCount || 0), 0),
    avgEventsPerGroup: displayUsers.reduce((sum, userId) => sum + (data.users[userId]?.eventCount || 0), 0) / displayUsers.length,
    activeEventTypes: filteredEventTypes.length
  } : { totalGroups: 0, totalEvents: 0, avgEventsPerGroup: 0, activeEventTypes: 0 }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {showFilters ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm text-muted-foreground">{getGroupLabel()}</div>
                <div className="font-semibold">{groupStats.totalGroups}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Activity className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Total Events</div>
                <div className="font-semibold">{groupStats.totalEvents}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-sm text-muted-foreground">{getAvgLabel()}</div>
                <div className="font-semibold">{groupStats.avgEventsPerGroup.toFixed(1)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Filter className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-sm text-muted-foreground">Event Types</div>
                <div className="font-semibold">{groupStats.activeEventTypes}</div>
              </div>
            </div>
          </div>

          {/* Event Type Filters */}
          {showFilters && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Event Type Filters</h4>
              <div className="flex flex-wrap gap-2">
                {data.eventTypes.map(eventType => (
                  <Badge
                    key={eventType}
                    variant={filteredEventTypes.includes(eventType) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleEventType(eventType)}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: colorScale(eventType) }}
                    />
                    {eventType}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                Click event type badges to show/hide them in the timeline
              </div>
            </div>
          )}

          {/* Timeline SVG */}
          <div ref={containerRef} className="w-full overflow-hidden border rounded-lg">
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="w-full"
              style={{ background: '#fafafa' }}
            />
          </div>

          {/* Hover Details */}
          {hoveredEvent && (
            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
              <h4 className="font-semibold text-blue-900">Event Details</h4>
              <div className="mt-2 space-y-1 text-sm">
                <div><span className="font-medium">Group:</span> {hoveredEvent.userId}</div>
                <div><span className="font-medium">Type:</span> {hoveredEvent.type}</div>
                <div><span className="font-medium">Position:</span> {hoveredEvent.position}</div>
                {hoveredEvent.tags.length > 0 && (
                  <div>
                    <span className="font-medium">Tags:</span>{' '}
                    {hoveredEvent.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="ml-1 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {hoveredEvent.uuid && (
                  <div><span className="font-medium">UUID:</span> {hoveredEvent.uuid}</div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 text-sm text-muted-foreground">
            <strong>Instructions:</strong> Scroll to zoom, click and drag to pan. 
            Hover over events to see details. Use zoom controls and filters to explore the timeline.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}