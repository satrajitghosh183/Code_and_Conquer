// Google Calendar API integration service
class CalendarService {
  constructor() {
    this.apiUrl = 'https://www.googleapis.com/calendar/v3'
  }

  // Get events from Google Calendar
  async getEvents(accessToken, timeMin = null, timeMax = null) {
    try {
      const now = new Date()
      const startOfWeek = timeMin || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const endOfWeek = timeMax || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const response = await fetch(
        `${this.apiUrl}/calendars/primary/events?timeMin=${startOfWeek}&timeMax=${endOfWeek}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Transform Google Calendar events to our task format
      return data.items.map(event => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        category: this.mapEventToCategory(event),
        status: this.getEventStatus(event),
        createdAt: event.created,
        dueAt: event.start?.dateTime || event.start?.date || null,
        completedAt: this.getEventCompletedAt(event),
        source: 'google_calendar',
        externalId: event.id
      }))
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error)
      throw error
    }
  }

  // Map event to category based on summary/description
  mapEventToCategory(event) {
    const summary = (event.summary || '').toLowerCase()
    const description = (event.description || '').toLowerCase()
    
    if (summary.includes('study') || summary.includes('learn') || description.includes('study')) {
      return 'STUDY'
    }
    if (summary.includes('workout') || summary.includes('exercise') || summary.includes('gym')) {
      return 'HEALTH'
    }
    if (summary.includes('project') || summary.includes('code') || summary.includes('dev')) {
      return 'PROJECT'
    }
    
    return 'MISC'
  }

  // Get event status (completed if past end time)
  getEventStatus(event) {
    const now = new Date()
    const endTime = event.end?.dateTime || event.end?.date
    
    if (!endTime) return 'TODO'
    
    return new Date(endTime) < now ? 'DONE' : 'TODO'
  }

  // Get completion time (end time if past)
  getEventCompletedAt(event) {
    const now = new Date()
    const endTime = event.end?.dateTime || event.end?.date
    
    if (!endTime) return null
    
    return new Date(endTime) < now ? endTime : null
  }
}

export default new CalendarService()

