// Visualization-specific projection templates for event stream analysis

export interface VisualizationTemplate {
  id: string
  name: string
  description: string
  code: string
  visualizationType: 'timeline' | 'flow' | 'heatmap' | 'network' | 'stats'
  category: 'user-analysis' | 'system-analysis' | 'business-metrics' | 'temporal-patterns'
  tags: string[]
}

export const visualizationTemplates: VisualizationTemplate[] = [
  {
    id: 'user-journey-timeline',
    name: 'User Journey Timeline',
    description: 'Track user events chronologically to visualize user journeys and behavior patterns',
    visualizationType: 'timeline',
    category: 'user-analysis',
    tags: ['user', 'journey', 'timeline', 'behavior'],
    code: `// User Journey Timeline Projection
// Tracks all events for users over time to visualize user journeys
function project(state, event) {
  if (!state) {
    state = {
      users: {},
      timeRange: { start: null, end: null },
      eventTypes: new Set(),
      totalEvents: 0
    };
  }

  // Extract user ID from various possible sources
  function extractUserId(event) {
    // Try to find user ID in tags (user:123, userId:456, etc.)
    for (const tag of event.tags || []) {
      if (tag.startsWith('user:') || tag.startsWith('userId:')) {
        return tag.split(':')[1];
      }
    }
    
    // Try to find in parsed data
    if (event.data_parsed) {
      return event.data_parsed.userId || 
             event.data_parsed.user_id || 
             event.data_parsed.user ||
             event.data_parsed.id;
    }
    
    return null;
  }

  const userId = extractUserId(event);
  if (!userId) return state; // Skip events without user ID

  // Initialize user if not exists
  if (!state.users[userId]) {
    state.users[userId] = {
      events: [],
      firstSeen: event.position,
      lastSeen: event.position,
      eventCount: 0,
      uniqueEventTypes: new Set()
    };
  }

  const user = state.users[userId];
  
  // Add event to user's timeline
  user.events.push({
    position: event.position,
    timestamp: new Date().toISOString(), // In real scenario, extract from event
    type: event.event_type,
    tags: event.tags || [],
    data: event.data_parsed,
    uuid: event.uuid
  });

  user.lastSeen = event.position;
  user.eventCount++;
  user.uniqueEventTypes.add(event.event_type);

  // Update global stats
  state.totalEvents++;
  state.eventTypes.add(event.event_type);
  
  if (!state.timeRange.start || event.position < state.timeRange.start) {
    state.timeRange.start = event.position;
  }
  if (!state.timeRange.end || event.position > state.timeRange.end) {
    state.timeRange.end = event.position;
  }

  // Convert Sets to arrays for JSON serialization
  user.uniqueEventTypes = Array.from(user.uniqueEventTypes);
  state.eventTypes = Array.from(state.eventTypes);

  return state;
}`
  },

  {
    id: 'event-flow-analysis',
    name: 'Event Flow Analysis',
    description: 'Analyze how events transition from one type to another to identify patterns and user flows',
    visualizationType: 'flow',
    category: 'user-analysis', 
    tags: ['flow', 'transitions', 'funnel', 'conversion'],
    code: `// Event Flow Analysis Projection
// Tracks event transitions to understand user flows and conversion funnels
function project(state, event) {
  if (!state) {
    state = {
      transitions: {},
      eventFrequency: {},
      userSessions: {},
      totalTransitions: 0,
      nodes: new Set(),
      sessionTimeout: 30 * 60 * 1000 // 30 minutes in milliseconds
    };
  }

  function extractUserId(event) {
    for (const tag of event.tags || []) {
      if (tag.startsWith('user:') || tag.startsWith('userId:')) {
        return tag.split(':')[1];
      }
    }
    if (event.data_parsed) {
      return event.data_parsed.userId || event.data_parsed.user_id || event.data_parsed.user;
    }
    return 'anonymous';
  }

  const userId = extractUserId(event);
  const eventType = event.event_type;
  const timestamp = event.position; // Using position as timestamp proxy

  // Initialize user session if not exists
  if (!state.userSessions[userId]) {
    state.userSessions[userId] = [];
  }

  const userSession = state.userSessions[userId];
  
  // Count event frequency
  state.eventFrequency[eventType] = (state.eventFrequency[eventType] || 0) + 1;
  state.nodes.add(eventType);

  // Find the last event in the user's session
  const lastEvent = userSession[userSession.length - 1];

  if (lastEvent) {
    // Create transition key
    const transitionKey = lastEvent.type + ' → ' + eventType;
    
    // Initialize transition if not exists
    if (!state.transitions[transitionKey]) {
      state.transitions[transitionKey] = {
        from: lastEvent.type,
        to: eventType,
        count: 0,
        users: new Set()
      };
    }

    // Update transition
    state.transitions[transitionKey].count++;
    state.transitions[transitionKey].users.add(userId);
    state.totalTransitions++;
  }

  // Add current event to user session
  userSession.push({
    type: eventType,
    timestamp: timestamp,
    tags: event.tags || []
  });

  // Convert Sets to arrays for JSON serialization
  state.nodes = Array.from(state.nodes);
  for (const transition of Object.values(state.transitions)) {
    transition.users = Array.from(transition.users);
  }

  return state;
}`
  },

  {
    id: 'activity-heatmap',
    name: 'Activity Heatmap',
    description: 'Generate time-based activity patterns to identify peak usage times and behavioral trends',
    visualizationType: 'heatmap',
    category: 'temporal-patterns',
    tags: ['heatmap', 'time', 'activity', 'patterns'],
    code: `// Activity Heatmap Projection
// Creates time-based activity patterns for heatmap visualization
function project(state, event) {
  if (!state) {
    state = {
      hourlyActivity: {}, // hour -> count
      dailyActivity: {},  // day -> count
      weeklyActivity: {}, // day of week -> hour -> count
      monthlyActivity: {}, // day of month -> count
      eventTypeActivity: {}, // event type -> time periods
      totalEvents: 0
    };
  }

  // Initialize weekly activity grid
  if (!state.weeklyActivity) {
    state.weeklyActivity = {};
    for (let day = 0; day < 7; day++) {
      state.weeklyActivity[day] = {};
      for (let hour = 0; hour < 24; hour++) {
        state.weeklyActivity[day][hour] = 0;
      }
    }
  }

  // For demo purposes, generate realistic time patterns based on position
  // In real implementation, you would extract actual timestamps from events
  const simulatedTimestamp = new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000)); // Random time in last 30 days
  
  const hour = simulatedTimestamp.getHours();
  const dayOfWeek = simulatedTimestamp.getDay(); // 0 = Sunday
  const dayOfMonth = simulatedTimestamp.getDate();
  const dayKey = simulatedTimestamp.toISOString().split('T')[0]; // YYYY-MM-DD

  // Update activity counters
  state.hourlyActivity[hour] = (state.hourlyActivity[hour] || 0) + 1;
  state.dailyActivity[dayKey] = (state.dailyActivity[dayKey] || 0) + 1;
  state.weeklyActivity[dayOfWeek][hour]++;
  state.monthlyActivity[dayOfMonth] = (state.monthlyActivity[dayOfMonth] || 0) + 1;

  // Track activity by event type
  if (!state.eventTypeActivity[event.event_type]) {
    state.eventTypeActivity[event.event_type] = {
      hourly: {},
      daily: {},
      total: 0
    };
  }

  const eventTypeActivity = state.eventTypeActivity[event.event_type];
  eventTypeActivity.hourly[hour] = (eventTypeActivity.hourly[hour] || 0) + 1;
  eventTypeActivity.daily[dayKey] = (eventTypeActivity.daily[dayKey] || 0) + 1;
  eventTypeActivity.total++;

  state.totalEvents++;

  return state;
}`
  },

  {
    id: 'system-performance-metrics',
    name: 'System Performance Metrics',
    description: 'Track system performance and operational metrics to identify bottlenecks and trends',
    visualizationType: 'stats',
    category: 'system-analysis',
    tags: ['performance', 'metrics', 'system', 'monitoring'],
    code: `// System Performance Metrics Projection
// Aggregates system performance and operational metrics
function project(state, event) {
  if (!state) {
    state = {
      totalEvents: 0,
      eventsByType: {},
      errorRate: 0,
      responseTimeStats: {
        min: null,
        max: null,
        avg: 0,
        count: 0,
        sum: 0
      },
      systemHealth: {
        errors: 0,
        warnings: 0,
        success: 0
      },
      throughputByMinute: {},
      uniqueUsers: new Set(),
      peakThroughput: 0,
      averageThroughput: 0
    };
  }

  state.totalEvents++;

  // Count events by type
  state.eventsByType[event.event_type] = (state.eventsByType[event.event_type] || 0) + 1;

  // Analyze event for system metrics
  const eventType = event.event_type.toLowerCase();
  
  // Categorize system health
  if (eventType.includes('error') || eventType.includes('failure') || eventType.includes('exception')) {
    state.systemHealth.errors++;
  } else if (eventType.includes('warning') || eventType.includes('timeout')) {
    state.systemHealth.warnings++;
  } else {
    state.systemHealth.success++;
  }

  // Extract performance metrics from event data
  if (event.data_parsed) {
    const data = event.data_parsed;
    
    // Response time analysis
    const responseTime = data.responseTime || data.duration || data.latency;
    if (typeof responseTime === 'number' && responseTime > 0) {
      const stats = state.responseTimeStats;
      stats.min = stats.min === null ? responseTime : Math.min(stats.min, responseTime);
      stats.max = stats.max === null ? responseTime : Math.max(stats.max, responseTime);
      stats.sum += responseTime;
      stats.count++;
      stats.avg = stats.sum / stats.count;
    }

    // Track unique users
    const userId = data.userId || data.user_id || data.user;
    if (userId) {
      state.uniqueUsers.add(userId);
    }
  }

  // Calculate throughput (events per minute)
  const minute = Math.floor(event.position / 100); // Simplified time calculation
  state.throughputByMinute[minute] = (state.throughputByMinute[minute] || 0) + 1;

  // Update peak throughput
  const currentMinuteThroughput = state.throughputByMinute[minute];
  if (currentMinuteThroughput > state.peakThroughput) {
    state.peakThroughput = currentMinuteThroughput;
  }

  // Calculate average throughput
  const totalMinutes = Object.keys(state.throughputByMinute).length;
  state.averageThroughput = totalMinutes > 0 ? state.totalEvents / totalMinutes : 0;

  // Calculate error rate
  state.errorRate = state.totalEvents > 0 ? 
    (state.systemHealth.errors / state.totalEvents * 100) : 0;

  // Convert Sets to arrays for JSON serialization
  state.uniqueUsers = Array.from(state.uniqueUsers);

  return state;
}`
  },

  {
    id: 'business-funnel-analysis',
    name: 'Business Funnel Analysis',
    description: 'Track business process completion rates and identify drop-off points in user funnels',
    visualizationType: 'flow',
    category: 'business-metrics',
    tags: ['funnel', 'conversion', 'business', 'process'],
    code: `// Business Funnel Analysis Projection
// Tracks user progression through business processes to identify conversion rates
function project(state, event) {
  if (!state) {
    state = {
      funnelSteps: [
        'user_registered',
        'profile_completed', 
        'first_purchase',
        'second_purchase',
        'subscription_activated'
      ],
      userProgress: {},
      stepConversions: {},
      dropOffAnalysis: {},
      totalUsers: 0,
      completedFunnel: 0
    };
  }

  function extractUserId(event) {
    for (const tag of event.tags || []) {
      if (tag.startsWith('user:')) return tag.split(':')[1];
    }
    if (event.data_parsed) {
      return event.data_parsed.userId || event.data_parsed.user_id;
    }
    return null;
  }

  const userId = extractUserId(event);
  if (!userId) return state;

  const eventType = event.event_type;
  
  // Initialize user if not exists
  if (!state.userProgress[userId]) {
    state.userProgress[userId] = {
      steps: [],
      currentStep: -1,
      completed: false,
      droppedAt: null,
      timeToComplete: null,
      firstEvent: event.position
    };
    state.totalUsers++;
  }

  const user = state.userProgress[userId];

  // Check if this event is a funnel step
  const stepIndex = state.funnelSteps.indexOf(eventType);
  if (stepIndex !== -1) {
    // User reached a funnel step
    if (stepIndex > user.currentStep) {
      user.currentStep = stepIndex;
      user.steps.push({
        step: eventType,
        stepIndex: stepIndex,
        position: event.position,
        timestamp: event.position // Using position as timestamp
      });

      // Initialize step conversion tracking
      if (!state.stepConversions[eventType]) {
        state.stepConversions[eventType] = {
          reached: 0,
          convertedToNext: 0,
          conversionRate: 0
        };
      }

      state.stepConversions[eventType].reached++;

      // Check if user completed the entire funnel
      if (stepIndex === state.funnelSteps.length - 1) {
        user.completed = true;
        user.timeToComplete = event.position - user.firstEvent;
        state.completedFunnel++;
      }

      // Update conversion to next step for previous step
      if (stepIndex > 0) {
        const prevStep = state.funnelSteps[stepIndex - 1];
        if (state.stepConversions[prevStep]) {
          state.stepConversions[prevStep].convertedToNext++;
          state.stepConversions[prevStep].conversionRate = 
            state.stepConversions[prevStep].convertedToNext / state.stepConversions[prevStep].reached;
        }
      }
    }
  }

  // Analyze drop-offs (users who haven't progressed in a while)
  for (const [uId, userProgress] of Object.entries(state.userProgress)) {
    if (!userProgress.completed && !userProgress.droppedAt) {
      const lastActivity = userProgress.steps.length > 0 ? 
        userProgress.steps[userProgress.steps.length - 1].position : 
        userProgress.firstEvent;
        
      // If user hasn't progressed in 1000 position units, mark as dropped
      if (event.position - lastActivity > 1000) {
        userProgress.droppedAt = userProgress.currentStep;
        
        // Update drop-off analysis
        const dropStep = userProgress.currentStep === -1 ? 'before_funnel' : state.funnelSteps[userProgress.currentStep];
        state.dropOffAnalysis[dropStep] = (state.dropOffAnalysis[dropStep] || 0) + 1;
      }
    }
  }

  // Calculate overall funnel metrics
  state.overallConversionRate = state.totalUsers > 0 ? state.completedFunnel / state.totalUsers : 0;

  return state;
}`
  }
];

// Utility function to get templates by category
export function getTemplatesByCategory(category: string): VisualizationTemplate[] {
  return visualizationTemplates.filter(template => template.category === category);
}

// Utility function to get templates by visualization type
export function getTemplatesByVisualizationType(type: string): VisualizationTemplate[] {
  return visualizationTemplates.filter(template => template.visualizationType === type);
}

// Utility function to search templates by tag
export function getTemplatesByTag(tag: string): VisualizationTemplate[] {
  return visualizationTemplates.filter(template => 
    template.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}