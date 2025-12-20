export interface StoredEventData<T = any> {
  timestamp: string  // ISO 8601 timestamp
  correlation_id: string  // UUID
  causation_id: string   // UUID
  triggered_by?: string  // Optional UUID
  data: T
}

export interface StoredEventDataParseResult<T = any> {
  isStoredEventData: boolean
  metadata?: {
    timestamp: string
    correlation_id: string
    causation_id: string
    triggered_by?: string
  }
  payload?: T
  rawData?: any
}

/**
 * Check if a UUID string is valid
 */
function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Check if a timestamp string is valid ISO 8601
 */
function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp)
  return !isNaN(date.getTime()) && timestamp.includes('T') && timestamp.includes('Z')
}

/**
 * Detect if parsed event data matches StoredEventData structure
 * Returns parsing result with extracted metadata and clean payload
 */
export function parseStoredEventData(eventData: any): StoredEventDataParseResult {
  // Handle null or undefined data
  if (!eventData || typeof eventData !== 'object') {
    return {
      isStoredEventData: false,
      rawData: eventData
    }
  }

  // Check for required fields
  const requiredFields = ['timestamp', 'correlation_id', 'causation_id', 'data']
  const hasRequiredFields = requiredFields.every(field => 
    field in eventData && eventData[field] !== null && eventData[field] !== undefined
  )

  if (!hasRequiredFields) {
    return {
      isStoredEventData: false,
      rawData: eventData
    }
  }

  // Validate field formats
  const { timestamp, correlation_id, causation_id, triggered_by, data } = eventData

  // Validate timestamp format
  if (typeof timestamp !== 'string' || !isValidTimestamp(timestamp)) {
    return {
      isStoredEventData: false,
      rawData: eventData
    }
  }

  // Validate correlation_id format
  if (typeof correlation_id !== 'string' || !isValidUuid(correlation_id)) {
    return {
      isStoredEventData: false,
      rawData: eventData
    }
  }

  // Validate causation_id format
  if (typeof causation_id !== 'string' || !isValidUuid(causation_id)) {
    return {
      isStoredEventData: false,
      rawData: eventData
    }
  }

  // Validate triggered_by format (optional)
  if (triggered_by !== undefined && triggered_by !== null) {
    if (typeof triggered_by !== 'string' || !isValidUuid(triggered_by)) {
      return {
        isStoredEventData: false,
        rawData: eventData
      }
    }
  }

  // If we get here, it's a valid StoredEventData structure
  return {
    isStoredEventData: true,
    metadata: {
      timestamp,
      correlation_id,
      causation_id,
      triggered_by: triggered_by || undefined
    },
    payload: data,
    rawData: eventData
  }
}

/**
 * Format timestamp for display
 */
export function formatEventTimestamp(timestamp: string, useLocalTime: boolean = true): string {
  const date = new Date(timestamp)
  
  if (useLocalTime) {
    return date.toLocaleString()
  } else {
    return date.toISOString()
  }
}

/**
 * Get relative time from timestamp (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`
  }
}

/**
 * Truncate UUID for display (show first 8 chars)
 */
export function truncateUuid(uuid: string): string {
  return uuid.slice(0, 8)
}