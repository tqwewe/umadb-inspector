import { UmaDBEvent } from '../types.js'
import { 
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { EventTableRow } from './EventTableRow'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'
import { parseStoredEventData } from '@/utils/storedEventData'

interface EventTableProps {
  events: UmaDBEvent[]
  hasMore?: boolean
  canLoadPrevious?: boolean
  onLoadNext?: () => void
  onLoadPrevious?: () => void
  onEventNavigate?: (eventId: string) => void
}

export function EventTable({ events, hasMore, canLoadPrevious, onLoadNext, onLoadPrevious, onEventNavigate }: EventTableProps) {
  const [hoveredCorrelationId, setHoveredCorrelationId] = useState<string | null>(null)
  
  // Check if any events use StoredEventData format to show additional columns
  const hasStoredEventData = useMemo(() => {
    return events.some(event => {
      const result = parseStoredEventData(event.data_parsed)
      return result.isStoredEventData
    })
  }, [events])
  if (events.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No events found.
      </div>
    )
  }

  const showPagination = onLoadNext || onLoadPrevious

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead className="w-[200px]">Event Type</TableHead>
              <TableHead className="w-[320px] min-w-[320px]">UUID</TableHead>
              <TableHead className="w-[100px] text-center">Position</TableHead>
              {hasStoredEventData && (
                <>
                  <TableHead className="w-[150px] hidden md:table-cell">Timestamp</TableHead>
                  <TableHead className="w-[120px] hidden lg:table-cell">Correlation</TableHead>
                </>
              )}
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event, index) => (
              <EventTableRow 
                key={event.uuid || `event-${event.position}-${index}`} 
                event={event} 
                hoveredCorrelationId={hoveredCorrelationId}
                onCorrelationHover={setHoveredCorrelationId}
                onTriggeredByClick={onEventNavigate}
                showStoredEventDataColumns={hasStoredEventData}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      
      {showPagination && (
        <div className="flex justify-center gap-2">
          <Button 
            variant="outline" 
            onClick={onLoadPrevious}
            disabled={!canLoadPrevious}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button 
            variant="outline" 
            onClick={onLoadNext}
            disabled={!hasMore}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}