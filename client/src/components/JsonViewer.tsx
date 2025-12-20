import { useState } from 'react'
import JsonView from '@uiw/react-json-view'
import { Button } from '@/components/ui/button'
import { BinaryViewer } from '@/components/BinaryViewer'
import { Code, Eye, Database, FileText, Settings, Clock, Hash, GitBranch, ArrowRight } from 'lucide-react'
import { detectDataFormat, type DataDetectionResult } from '@/utils/dataFormatDetection'
import { parseStoredEventData, getRelativeTime, truncateUuid } from '@/utils/storedEventData'
import { useTimestamp } from '@/contexts/TimestampContext'

interface JsonViewerProps {
  content: string | null
  encoding?: 'base64-cbor' | 'base64-binary' | 'json' | null
  parsed_data?: any
  title?: string
  onTriggeredByClick?: (eventId: string) => void
  hideStoredEventMetadata?: boolean
}

type ViewMode = 'structured' | 'raw'
type ManualEncoding = 'auto' | 'json'

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

export function JsonViewer({ content, encoding, parsed_data, title, onTriggeredByClick, hideStoredEventMetadata }: JsonViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('structured')
  const [manualEncoding, setManualEncoding] = useState<ManualEncoding>('auto')
  const { formatTimestamp } = useTimestamp()

  // Check if content is null or empty (but allow parsed_data to exist without content)
  if (!content && !parsed_data) {
    return (
      <div className="text-muted-foreground text-sm italic">
        No {title?.toLowerCase()} data
      </div>
    )
  }

  // Simplified detection logic since server now handles CBOR parsing
  let detection: DataDetectionResult
  
  if (parsed_data && manualEncoding === 'auto') {
    // Server successfully parsed the data (CBOR -> JSON) - use it directly
    detection = {
      format: 'json', // Server returns parsed CBOR as JSON
      data: parsed_data,
      originalContent: content || '',
    }
  } else if (content && manualEncoding === 'json') {
    // Manual JSON override - try to parse content as JSON
    try {
      const jsonData = JSON.parse(content)
      detection = {
        format: 'json',
        data: jsonData,
        originalContent: content,
      }
    } catch {
      // If JSON parsing fails, fall back to auto-detection
      detection = detectDataFormat(content, encoding)
    }
  } else if (content) {
    // Auto detection using existing logic
    detection = detectDataFormat(content, encoding)
  } else {
    // Only parsed_data is available, no raw content
    detection = {
      format: 'json',
      data: parsed_data,
      originalContent: '',
    }
  }

  // Check if this is StoredEventData format
  const storedEventResult = parseStoredEventData(detection.data)
  
  // Determine if we have structured data that can be displayed nicely
  const isStructuredData = detection.format === 'json' || detection.format === 'cbor'

  return (
    <div className="space-y-2">
      {/* Format indicator, encoding override, and toggle buttons */}
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {isStructuredData ? (
              <>
                {detection.format === 'cbor' ? (
                  <>
                    <Database className="h-3 w-3" />
                    {manualEncoding !== 'auto' ? 'Manual: CBOR' : 'Server Parsed: CBOR'}
                    {detection.isBase64Encoded && ' (Base64)'}
                  </>
                ) : (
                  <>
                    <FileText className="h-3 w-3" />
                    {manualEncoding !== 'auto' ? `Manual: ${manualEncoding.toUpperCase()}` : 
                     parsed_data && manualEncoding === 'auto' ? 'Server Parsed: JSON' : 'Detected: JSON'}
                  </>
                )}
              </>
            ) : (
              <>
                <FileText className="h-3 w-3" />
                Detected: {detection.format === 'binary' ? 'Binary Data' : detection.format === 'text' ? 'Plain Text' : 'Raw Data'}
              </>
            )}
          </span>
          
          {/* Manual encoding override */}
          <div className="flex items-center gap-1">
            <Settings className="h-3 w-3 text-muted-foreground" />
            <select 
              value={manualEncoding} 
              onChange={(e) => setManualEncoding(e.target.value as ManualEncoding)}
              className="h-7 text-xs border border-border rounded px-2 bg-background"
            >
              <option value="auto">Auto</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'structured' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('structured')}
            className="h-7 px-2 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Structured
          </Button>
          <Button
            variant={viewMode === 'raw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('raw')}
            className="h-7 px-2 text-xs"
          >
            <Code className="h-3 w-3 mr-1" />
            Raw
          </Button>
        </div>
      </div>

      {/* Content display */}
      {viewMode === 'structured' ? (
        <div className="space-y-3">
          {/* StoredEventData metadata display */}
          {!hideStoredEventMetadata && storedEventResult.isStoredEventData && storedEventResult.metadata && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
              <h4 className="font-medium text-sm text-blue-800 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Event Metadata
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-blue-600" />
                  <span className="font-medium text-blue-700">Timestamp:</span>
                  <span className="font-mono text-blue-800">
                    {formatTimestamp(new Date(storedEventResult.metadata.timestamp).getTime())}
                  </span>
                  <span className="text-blue-600 text-xs">
                    ({getRelativeTime(storedEventResult.metadata.timestamp)})
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Hash className="h-3 w-3 text-blue-600" />
                  <span className="font-medium text-blue-700">Correlation:</span>
                  <CopyableField 
                    value={storedEventResult.metadata.correlation_id} 
                    className="font-mono text-blue-800 bg-blue-100 hover:bg-blue-200"
                  >
                    {truncateUuid(storedEventResult.metadata.correlation_id)}
                  </CopyableField>
                </div>
                
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3 w-3 text-blue-600" />
                  <span className="font-medium text-blue-700">Causation:</span>
                  <CopyableField 
                    value={storedEventResult.metadata.causation_id}
                    className="font-mono text-blue-800 bg-blue-100 hover:bg-blue-200"
                  >
                    {truncateUuid(storedEventResult.metadata.causation_id)}
                  </CopyableField>
                </div>
                
                {storedEventResult.metadata.triggered_by && (
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 text-blue-600" />
                    <span className="font-medium text-blue-700">Triggered By:</span>
                    <button
                      onClick={() => onTriggeredByClick?.(storedEventResult.metadata!.triggered_by!)}
                      className="font-mono text-blue-800 bg-blue-100 hover:bg-blue-200 px-1 py-0.5 rounded transition-colors underline"
                      title={`Navigate to event: ${storedEventResult.metadata.triggered_by}`}
                    >
                      {truncateUuid(storedEventResult.metadata.triggered_by)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Event payload display */}
          <div className="bg-muted p-3 rounded overflow-x-auto">
            {isStructuredData ? (
              <JsonView
                value={storedEventResult.isStoredEventData ? storedEventResult.payload : detection.data}
                collapsed={2}
                displayDataTypes={false}
                enableClipboard={false}
                style={{
                  backgroundColor: 'transparent',
                  fontSize: '12px',
                }}
              />
            ) : detection.format === 'binary' && content ? (
              <BinaryViewer 
                content={content}
                isBase64Encoded={detection.isBase64Encoded}
                isHexEncoded={detection.isHexEncoded}
              />
            ) : (
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {content || detection.data || 'No content'}
              </pre>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
            {isStructuredData ? JSON.stringify(storedEventResult.isStoredEventData ? storedEventResult.payload : detection.data, null, 2) : (content || detection.data || 'No content')}
          </pre>
        </div>
      )}
    </div>
  )
}