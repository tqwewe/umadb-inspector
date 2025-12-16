import { UmaDBEvent } from '../types.js'
import { TableCell, TableRow } from '@/components/ui/table'
import { JsonViewer } from '@/components/JsonViewer'
import { 
  ChevronDown,
  ChevronRight,
  Hash,
  Database,
  FileText,
  Layers
} from 'lucide-react'
import { useState } from 'react'

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
}

export function EventTableRow({ event }: EventTableRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
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
          <TableCell colSpan={5} className="p-0">
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