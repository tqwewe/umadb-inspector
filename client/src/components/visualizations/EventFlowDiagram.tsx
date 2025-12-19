import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  GitBranch, 
  TrendingUp,
  Users,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Info
} from 'lucide-react'

interface FlowTransition {
  from: string
  to: string
  count: number
  users: string[]
}

interface FlowData {
  transitions: Record<string, FlowTransition>
  eventFrequency: Record<string, number>
  nodes: string[]
  totalTransitions: number
}

interface EventFlowDiagramProps {
  data: FlowData
  title?: string
  description?: string
  width?: number
  height?: number
}

interface Node {
  id: string
  group: number
  value: number
  x?: number
  y?: number
}

interface Link {
  source: string | Node
  target: string | Node
  value: number
  transition: FlowTransition
}

export function EventFlowDiagram({ 
  data, 
  title = "Event Flow Analysis", 
  description = "Interactive flow diagram showing event transitions and user journeys",
  width = 800,
  height = 600 
}: EventFlowDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<FlowTransition | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Process data for D3 force simulation
  const processData = () => {
    const nodes: Node[] = data.nodes.map((nodeId, index) => ({
      id: nodeId,
      group: Math.floor(index / 3), // Group for coloring
      value: data.eventFrequency[nodeId] || 0
    }))

    const links: Link[] = Object.values(data.transitions).map(transition => ({
      source: transition.from,
      target: transition.to,
      value: transition.count,
      transition
    }))

    return { nodes, links }
  }

  const { nodes, links } = processData()

  // Color scales
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
  const linkColorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, d3.max(links, d => d.value) || 1])

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const margin = { top: 20, right: 20, bottom: 20, left: 20 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Create main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links)
        .id(d => d.id)
        .distance(100)
        .strength(0.3))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force("collision", d3.forceCollide().radius(30))

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        const { transform } = event
        setZoomLevel(transform.k)
        g.attr("transform", 
          `translate(${margin.left + transform.x},${margin.top + transform.y}) scale(${transform.k})`
        )
      })

    svg.call(zoom)

    // Create arrow marker for directed edges
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .append("path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#999")
      .style("stroke", "none")

    // Add links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(links)
      .enter().append("path")
      .attr("stroke", d => linkColorScale(d.value))
      .attr("stroke-width", d => Math.max(1, Math.sqrt(d.value) * 2))
      .attr("fill", "none")
      .attr("marker-end", "url(#arrowhead)")
      .style("opacity", 0.7)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        setHoveredLink(d.transition)
        d3.select(event.target).style("opacity", 1).attr("stroke-width", d => Math.max(3, Math.sqrt(d.value) * 3))
      })
      .on("mouseout", (event, d) => {
        setHoveredLink(null)
        d3.select(event.target).style("opacity", 0.7).attr("stroke-width", d => Math.max(1, Math.sqrt(d.value) * 2))
      })

    // Add nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    // Node circles
    node.append("circle")
      .attr("r", d => Math.max(15, Math.sqrt(d.value) * 3))
      .attr("fill", d => colorScale(d.group.toString()))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .on("click", (event, d) => {
        setSelectedNode(selectedNode === d.id ? null : d.id)
      })
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke-width", 4)
      })
      .on("mouseout", function(event, d) {
        d3.select(this).attr("stroke-width", 2)
      })

    // Node labels
    node.append("text")
      .text(d => d.id.length > 12 ? d.id.substring(0, 12) + "..." : d.id)
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("pointer-events", "none")

    // Node value badges
    node.append("text")
      .text(d => d.value)
      .attr("x", 0)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "8px")
      .style("fill", "#666")
      .style("pointer-events", "none")

    // Update positions on simulation tick
    simulation.on("tick", () => {
      // Update links with curved paths
      link.attr("d", d => {
        const source = d.source as Node
        const target = d.target as Node
        
        // Calculate control point for curved path
        const dx = target.x! - source.x!
        const dy = target.y! - source.y!
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.3
        
        return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`
      })

      // Update node positions
      node.attr("transform", d => `translate(${d.x},${d.y})`)
    })

    // Drag functions
    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

  }, [data, nodes, links, width, height, selectedNode])

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
    setSelectedNode(null)
  }

  // Calculate statistics
  const stats = {
    totalNodes: nodes.length,
    totalTransitions: data.totalTransitions,
    avgTransitionsPerNode: nodes.length > 0 ? data.totalTransitions / nodes.length : 0,
    mostActiveNode: nodes.reduce((max, node) => 
      node.value > (max?.value || 0) ? node : max, nodes[0])
  }

  const selectedNodeData = selectedNode ? 
    nodes.find(n => n.id === selectedNode) : null

  const selectedNodeTransitions = selectedNode ? {
    incoming: Object.values(data.transitions).filter(t => t.to === selectedNode),
    outgoing: Object.values(data.transitions).filter(t => t.from === selectedNode)
  } : { incoming: [], outgoing: [] }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
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
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <GitBranch className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm text-muted-foreground">Event Types</div>
                <div className="font-semibold">{stats.totalNodes}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Transitions</div>
                <div className="font-semibold">{stats.totalTransitions}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-sm text-muted-foreground">Avg/Node</div>
                <div className="font-semibold">{stats.avgTransitionsPerNode.toFixed(1)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-sm text-muted-foreground">Most Active</div>
                <div className="font-semibold text-xs">{stats.mostActiveNode?.id.substring(0, 10) || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Flow Chart */}
          <div className="w-full overflow-hidden border rounded-lg">
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="w-full"
              style={{ background: '#fafafa' }}
            />
          </div>

          {/* Hover Details */}
          {hoveredLink && (
            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
              <h4 className="font-semibold text-blue-900">Transition Details</h4>
              <div className="mt-2 space-y-1 text-sm">
                <div><span className="font-medium">From:</span> {hoveredLink.from}</div>
                <div><span className="font-medium">To:</span> {hoveredLink.to}</div>
                <div><span className="font-medium">Count:</span> {hoveredLink.count}</div>
                <div><span className="font-medium">Unique Sources:</span> {hoveredLink.users.length}</div>
              </div>
            </div>
          )}

          {/* Selected Node Details */}
          {selectedNodeData && (
            <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 rounded">
              <h4 className="font-semibold text-green-900 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Selected: {selectedNodeData.id}
              </h4>
              <div className="mt-3 grid grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-sm mb-2">Incoming Transitions ({selectedNodeTransitions.incoming.length})</h5>
                  {selectedNodeTransitions.incoming.length > 0 ? (
                    <div className="space-y-1">
                      {selectedNodeTransitions.incoming.slice(0, 5).map((transition, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{transition.from}</span>
                          <Badge variant="secondary" className="text-xs">{transition.count}</Badge>
                        </div>
                      ))}
                      {selectedNodeTransitions.incoming.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          +{selectedNodeTransitions.incoming.length - 5} more...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No incoming transitions</div>
                  )}
                </div>
                <div>
                  <h5 className="font-medium text-sm mb-2">Outgoing Transitions ({selectedNodeTransitions.outgoing.length})</h5>
                  {selectedNodeTransitions.outgoing.length > 0 ? (
                    <div className="space-y-1">
                      {selectedNodeTransitions.outgoing.slice(0, 5).map((transition, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{transition.to}</span>
                          <Badge variant="secondary" className="text-xs">{transition.count}</Badge>
                        </div>
                      ))}
                      {selectedNodeTransitions.outgoing.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          +{selectedNodeTransitions.outgoing.length - 5} more...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No outgoing transitions</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 text-sm text-muted-foreground">
            <strong>Instructions:</strong> Drag nodes to rearrange, click nodes to see transition details, 
            hover over connections to see flow information. Use zoom controls to explore the diagram.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}