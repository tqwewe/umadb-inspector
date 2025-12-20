import { UmaDBEvent } from '../types.js'
import { TableCell, TableRow } from '@/components/ui/table'
import { JsonViewer } from '@/components/JsonViewer'
import { 
  ChevronDown,
  ChevronRight,
  Hash,
  Database,
  FileText,
  Layers,
  Clock,
  GitBranch,
  ArrowRight
} from 'lucide-react'
import { useState } from 'react'
import { parseStoredEventData, getRelativeTime, truncateUuid } from '@/utils/storedEventData'
import { useTimestamp } from '@/contexts/TimestampContext'

interface CopyableFieldProps {
  value: string
  children: React.ReactNode
  className?: string
}

function CopyableField({ value, children, className = "" }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }
  
  return (
    <span 
      className={`cursor-pointer hover:bg-primary/10 rounded px-1 py-0.5 transition-colors relative ${className}`}
      onClick={handleCopy}
      title={`Click to copy: ${value}`}
    >
      {children}
      {copied && (
        <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          Copied!
        </span>
      )}
    </span>
  )
}

interface EventTableRowProps {
  event: UmaDBEvent
  hoveredCorrelationId?: string | null
  onCorrelationHover?: (correlationId: string | null) => void
  onTriggeredByClick?: (eventId: string) => void
  showStoredEventDataColumns?: boolean
}

export function EventTableRow({ event, hoveredCorrelationId, onCorrelationHover, onTriggeredByClick, showStoredEventDataColumns }: EventTableRowProps) {
  const [expanded, setExpanded] = useState(false)
  const { formatTimestamp } = useTimestamp()
  
  // Parse StoredEventData if applicable
  const storedEventResult = parseStoredEventData(event.data_parsed)
  
  // Determine if this event should be dimmed based on correlation ID hover
  const shouldDim = hoveredCorrelationId && 
    storedEventResult.isStoredEventData && 
    storedEventResult.metadata?.correlation_id !== hoveredCorrelationId

  return (
    <>
      <TableRow 
        className={`cursor-pointer hover:bg-muted/50 transition-all ${shouldDim ? 'opacity-30' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="w-[30px] p-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
        <TableCell className="font-semibold text-purple-700">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {event.event_type}
            </span>
            {storedEventResult.isStoredEventData && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300" title="StoredEventData format">
                <Database className="h-3 w-3" />
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="min-w-[320px] w-[320px]">
          {event.uuid ? (
            <CopyableField value={event.uuid} className="font-mono text-xs text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis block w-full">
              {event.uuid}
            </CopyableField>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              No UUID provided
            </span>
          )}
        </TableCell>
        <TableCell className="text-center font-mono text-sm font-medium">
          {event.position.toLocaleString()}
        </TableCell>
        {showStoredEventDataColumns && (
          <>
            <TableCell className="hidden md:table-cell">
              {storedEventResult.isStoredEventData && storedEventResult.metadata ? (
                <div className="text-xs">
                  <div className="font-mono text-gray-700">
                    {formatTimestamp(new Date(storedEventResult.metadata.timestamp).getTime())}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {getRelativeTime(storedEventResult.metadata.timestamp)}
                  </div>
                </div>
              ) : (
                <span className="text-gray-400 text-xs italic">—</span>
              )}
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {storedEventResult.isStoredEventData && storedEventResult.metadata ? (
                <CopyableField 
                  value={storedEventResult.metadata.correlation_id} 
                  className="font-mono text-xs bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded px-1 py-0.5"
                >
                  <span 
                    onMouseEnter={() => onCorrelationHover?.(storedEventResult.metadata!.correlation_id)}
                    onMouseLeave={() => onCorrelationHover?.(null)}
                    className="cursor-pointer"
                  >
                    {truncateUuid(storedEventResult.metadata.correlation_id)}
                  </span>
                </CopyableField>
              ) : (
                <span className="text-gray-400 text-xs italic">—</span>
              )}
            </TableCell>
          </>
        )}
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                +{event.tags.length - 3} more
              </span>
            )}
            {event.tags.length === 0 && (
              <span className="text-muted-foreground text-xs italic">No tags</span>
            )}
          </div>
        </TableCell>
      </TableRow>
      
      {expanded && (
        <TableRow>
          <TableCell colSpan={showStoredEventDataColumns ? 7 : 5} className="p-0">
            <div className="bg-muted/30 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Event Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <strong className="text-gray-700">UUID:</strong> 
                      {event.uuid ? (
                        <CopyableField value={event.uuid} className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border">
                          {event.uuid}
                        </CopyableField>
                      ) : (
                        <span className="text-muted-foreground italic bg-red-50 px-2 py-1 rounded border border-red-200">
                          No UUID provided
                        </span>
                      )}
                    </div>
                    <div>
                      <strong className="text-gray-700">Event Type:</strong> 
                      <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        {event.event_type}
                      </span>
                    </div>
                    <div>
                      <strong className="text-gray-700">Position:</strong> 
                      <span className="ml-2 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {event.position.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Tags
                  </h4>
                  <div className="space-y-3 text-sm">
                    {event.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map((tag, index) => (
                          <CopyableField key={index} value={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                            {tag}
                          </CopyableField>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic bg-gray-50 p-3 rounded border-l-4 border-gray-300">
                        No tags associated with this event
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Show only additional StoredEventData metadata that's not in columns */}
              {storedEventResult.isStoredEventData && storedEventResult.metadata && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Additional Event Metadata
                  </h4>
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-700">Causation ID:</span>
                        <CopyableField 
                          value={storedEventResult.metadata.causation_id}
                          className="font-mono text-blue-800 bg-blue-100 hover:bg-blue-200 text-xs"
                        >
                          {truncateUuid(storedEventResult.metadata.causation_id)}
                        </CopyableField>
                      </div>
                      {storedEventResult.metadata.triggered_by && (
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-700">Triggered By:</span>
                          <button
                            onClick={() => onTriggeredByClick?.(storedEventResult.metadata!.triggered_by!)}
                            className="font-mono text-blue-800 bg-blue-100 hover:bg-blue-200 px-1 py-0.5 rounded transition-colors underline text-xs"
                            title={`Navigate to event: ${storedEventResult.metadata.triggered_by}`}
                          >
                            {truncateUuid(storedEventResult.metadata.triggered_by)}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {(event.data || event.data_parsed) && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Event Data
                  </h4>
                  <JsonViewer 
                    content={event.data} 
                    encoding={event.data_encoding}
                    parsed_data={event.data_parsed}
                    title="data"
                    onTriggeredByClick={onTriggeredByClick}
                    hideStoredEventMetadata={showStoredEventDataColumns}
                  />
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}