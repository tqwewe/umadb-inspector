import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock,
  Activity,
  TrendingUp,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface HeatmapData {
  hourlyActivity: Record<number, number>
  dailyActivity: Record<string, number>
  weeklyActivity: Record<number, Record<number, number>>
  monthlyActivity: Record<number, number>
  eventTypeActivity: Record<string, {
    hourly: Record<number, number>
    daily: Record<string, number>
    total: number
  }>
  totalEvents: number
}

interface ActivityHeatmapProps {
  data: HeatmapData
  title?: string
  description?: string
  width?: number
  height?: number
}

interface HeatmapCell {
  day: number
  hour: number
  value: number
  dayName: string
}

export function ActivityHeatmap({ 
  data, 
  title = "Activity Heatmap", 
  description = "Time-based activity patterns showing peak usage times",
  width = 900,
  height = 400 
}: ActivityHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedView, setSelectedView] = useState<'weekly' | 'daily' | 'hourly'>('weekly')
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<any>(null)

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`)

  // Process weekly heatmap data
  const processWeeklyData = (): HeatmapCell[] => {
    const cells: HeatmapCell[] = []
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const value = selectedEventType 
          ? (data.eventTypeActivity[selectedEventType]?.hourly[hour] || 0)
          : (data.weeklyActivity[day]?.[hour] || 0)
        
        cells.push({
          day,
          hour,
          value,
          dayName: dayNames[day]
        })
      }
    }
    
    return cells
  }

  // Process daily activity for the last 30 days
  const processDailyData = (): { date: string; value: number; dayOfWeek: number }[] => {
    const dailyData = selectedEventType 
      ? data.eventTypeActivity[selectedEventType]?.daily || {}
      : data.dailyActivity

    return Object.entries(dailyData)
      .map(([date, value]) => ({
        date,
        value: value as number,
        dayOfWeek: new Date(date).getDay()
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30) // Last 30 days
  }

  // Process hourly activity
  const processHourlyData = (): { hour: number; value: number }[] => {
    const hourlyData = selectedEventType 
      ? data.eventTypeActivity[selectedEventType]?.hourly || {}
      : data.hourlyActivity

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      value: hourlyData[hour] || 0
    }))
  }

  const weeklyData = processWeeklyData()
  const dailyData = processDailyData()
  const hourlyData = processHourlyData()

  // Color scale based on the selected view
  const getColorScale = () => {
    let maxValue = 0
    
    if (selectedView === 'weekly') {
      maxValue = Math.max(...weeklyData.map(d => d.value))
    } else if (selectedView === 'daily') {
      maxValue = Math.max(...dailyData.map(d => d.value))
    } else {
      maxValue = Math.max(...hourlyData.map(d => d.value))
    }

    return d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, maxValue])
  }

  const colorScale = getColorScale()

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    if (selectedView === 'weekly') {
      renderWeeklyHeatmap(svg)
    } else if (selectedView === 'daily') {
      renderDailyHeatmap(svg)
    } else {
      renderHourlyChart(svg)
    }
  }, [data, selectedView, selectedEventType, weeklyData, dailyData, hourlyData, colorScale, width, height])

  const renderWeeklyHeatmap = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    const margin = { top: 40, right: 40, bottom: 80, left: 80 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const cellWidth = innerWidth / 24
    const cellHeight = innerHeight / 7

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Add hour labels (x-axis)
    g.selectAll(".hour-label")
      .data(hourLabels)
      .enter().append("text")
      .attr("class", "hour-label")
      .attr("x", (_, i) => i * cellWidth + cellWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#666")
      .text((d, i) => i % 2 === 0 ? d : '') // Show every other hour to avoid crowding

    // Add day labels (y-axis)
    g.selectAll(".day-label")
      .data(dayNames)
      .enter().append("text")
      .attr("class", "day-label")
      .attr("x", -10)
      .attr("y", (_, i) => i * cellHeight + cellHeight / 2)
      .attr("text-anchor", "end")
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text(d => d)

    // Add heatmap cells
    g.selectAll(".heatmap-cell")
      .data(weeklyData)
      .enter().append("rect")
      .attr("class", "heatmap-cell")
      .attr("x", d => d.hour * cellWidth)
      .attr("y", d => d.day * cellHeight)
      .attr("width", cellWidth - 1)
      .attr("height", cellHeight - 1)
      .attr("fill", d => d.value === 0 ? "#f0f0f0" : colorScale(d.value))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        setHoveredCell(d)
        d3.select(event.target).attr("stroke-width", 2).attr("stroke", "#333")
      })
      .on("mouseout", (event) => {
        setHoveredCell(null)
        d3.select(event.target).attr("stroke-width", 1).attr("stroke", "#fff")
      })

    // Add value labels for high-activity cells
    g.selectAll(".cell-text")
      .data(weeklyData.filter(d => d.value > 0))
      .enter().append("text")
      .attr("class", "cell-text")
      .attr("x", d => d.hour * cellWidth + cellWidth / 2)
      .attr("y", d => d.day * cellHeight + cellHeight / 2)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "8px")
      .style("fill", d => d.value > colorScale.domain()[1] * 0.5 ? "#fff" : "#333")
      .style("pointer-events", "none")
      .text(d => d.value > 0 ? d.value : '')
  }

  const renderDailyHeatmap = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    const margin = { top: 40, right: 40, bottom: 60, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const cellWidth = innerWidth / Math.min(dailyData.length, 30)
    const cellHeight = 20

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Add date labels
    g.selectAll(".date-label")
      .data(dailyData.slice(-30))
      .enter().append("text")
      .attr("class", "date-label")
      .attr("x", (_, i) => i * cellWidth + cellWidth / 2)
      .attr("y", cellHeight + 20)
      .attr("text-anchor", "middle")
      .style("font-size", "9px")
      .style("fill", "#666")
      .text((d, i) => i % 5 === 0 ? new Date(d.date).getDate() : '')

    // Add month labels
    const monthLabels = dailyData.slice(-30).reduce((acc, d, i) => {
      const date = new Date(d.date)
      const month = date.toLocaleDateString('en', { month: 'short' })
      const day = date.getDate()
      if (day === 1 || i === 0) {
        acc.push({ index: i, month })
      }
      return acc
    }, [] as { index: number; month: string }[])

    g.selectAll(".month-label")
      .data(monthLabels)
      .enter().append("text")
      .attr("class", "month-label")
      .attr("x", d => d.index * cellWidth)
      .attr("y", -10)
      .style("font-size", "11px")
      .style("fill", "#333")
      .style("font-weight", "bold")
      .text(d => d.month)

    // Add daily activity cells
    g.selectAll(".daily-cell")
      .data(dailyData.slice(-30))
      .enter().append("rect")
      .attr("class", "daily-cell")
      .attr("x", (_, i) => i * cellWidth + 1)
      .attr("y", 0)
      .attr("width", cellWidth - 2)
      .attr("height", cellHeight)
      .attr("fill", d => d.value === 0 ? "#f0f0f0" : colorScale(d.value))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        setHoveredCell(d)
        d3.select(event.target).attr("stroke-width", 2).attr("stroke", "#333")
      })
      .on("mouseout", (event) => {
        setHoveredCell(null)
        d3.select(event.target).attr("stroke-width", 1).attr("stroke", "#fff")
      })
  }

  const renderHourlyChart = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => {
    const margin = { top: 40, right: 40, bottom: 60, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Scales
    const xScale = d3.scaleBand()
      .domain(hourlyData.map(d => d.hour.toString()))
      .range([0, innerWidth])
      .padding(0.1)

    const yScale = d3.scaleLinear()
      .domain([0, Math.max(...hourlyData.map(d => d.value))])
      .range([innerHeight, 0])

    // Add bars
    g.selectAll(".hour-bar")
      .data(hourlyData)
      .enter().append("rect")
      .attr("class", "hour-bar")
      .attr("x", d => xScale(d.hour.toString())!)
      .attr("y", d => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", d => innerHeight - yScale(d.value))
      .attr("fill", d => colorScale(d.value))
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        setHoveredCell(d)
        d3.select(event.target).attr("opacity", 0.8)
      })
      .on("mouseout", (event) => {
        setHoveredCell(null)
        d3.select(event.target).attr("opacity", 1)
      })

    // Add x-axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d => `${d}:00`))
      .selectAll("text")
      .style("font-size", "10px")

    // Add y-axis
    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "10px")
  }

  const handleReset = () => {
    setSelectedEventType(null)
    setSelectedView('weekly')
    setHoveredCell(null)
  }

  // Calculate stats
  const stats = {
    totalEvents: data.totalEvents,
    peakHour: Object.entries(data.hourlyActivity)
      .sort(([,a], [,b]) => b - a)[0],
    eventTypes: Object.keys(data.eventTypeActivity).length,
    avgEventsPerHour: data.totalEvents / 24
  }

  const eventTypes = Object.keys(data.eventTypeActivity).slice(0, 10) // Limit for UI

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={selectedView === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('weekly')}
              >
                Weekly
              </Button>
              <Button
                variant={selectedView === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('daily')}
              >
                Daily
              </Button>
              <Button
                variant={selectedView === 'hourly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('hourly')}
              >
                Hourly
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
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm text-muted-foreground">Total Events</div>
                <div className="font-semibold">{stats.totalEvents.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Peak Hour</div>
                <div className="font-semibold">{stats.peakHour?.[0] || 'N/A'}:00</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-sm text-muted-foreground">Event Types</div>
                <div className="font-semibold">{stats.eventTypes}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Activity className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-sm text-muted-foreground">Avg/Hour</div>
                <div className="font-semibold">{stats.avgEventsPerHour.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* Event Type Filters */}
          {showFilters && eventTypes.length > 0 && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Event Type Filter</h4>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedEventType === null ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => setSelectedEventType(null)}
                >
                  All Events
                </Badge>
                {eventTypes.map(eventType => (
                  <Badge
                    key={eventType}
                    variant={selectedEventType === eventType ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => setSelectedEventType(eventType)}
                  >
                    {eventType}
                    <span className="ml-1 text-xs">({data.eventTypeActivity[eventType].total})</span>
                  </Badge>
                ))}
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                Click to filter heatmap by specific event types
              </div>
            </div>
          )}

          {/* Heatmap */}
          <div className="w-full overflow-hidden border rounded-lg">
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="w-full"
              style={{ background: '#fafafa' }}
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <span className="text-sm text-muted-foreground">Less</span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 border border-gray-300"
                  style={{ 
                    backgroundColor: i === 0 ? '#f0f0f0' : colorScale(colorScale.domain()[1] * (i / 4))
                  }}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">More</span>
          </div>

          {/* Hover Details */}
          {hoveredCell && (
            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
              <h4 className="font-semibold text-blue-900">Activity Details</h4>
              <div className="mt-2 space-y-1 text-sm">
                {selectedView === 'weekly' && 'dayName' in hoveredCell && (
                  <>
                    <div><span className="font-medium">Day:</span> {hoveredCell.dayName}</div>
                    <div><span className="font-medium">Hour:</span> {hoveredCell.hour}:00</div>
                    <div><span className="font-medium">Events:</span> {hoveredCell.value}</div>
                  </>
                )}
                {selectedView === 'daily' && 'date' in hoveredCell && (
                  <>
                    <div><span className="font-medium">Date:</span> {new Date(hoveredCell.date).toLocaleDateString()}</div>
                    <div><span className="font-medium">Events:</span> {hoveredCell.value}</div>
                  </>
                )}
                {selectedView === 'hourly' && 'hour' in hoveredCell && (
                  <>
                    <div><span className="font-medium">Hour:</span> {hoveredCell.hour}:00</div>
                    <div><span className="font-medium">Events:</span> {hoveredCell.value}</div>
                  </>
                )}
                {selectedEventType && (
                  <div><span className="font-medium">Event Type:</span> {selectedEventType}</div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 text-sm text-muted-foreground">
            <strong>Instructions:</strong> Switch between weekly, daily, and hourly views. 
            Use filters to focus on specific event types. Hover over cells to see detailed activity information.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}