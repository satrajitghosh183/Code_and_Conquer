import taskService from './taskService.js'; // stores tokens for users
// Using native fetch (available in Node.js 18+)

class CalendarService {
  constructor() {
    this.apiUrl = 'https://www.googleapis.com/calendar/v3';
  }

  // Refresh access token using refresh_token
  async refreshAccessToken(userId) {
    const integration = taskService.getIntegration(userId, 'google_calendar');
    if (!integration?.refresh_token) throw new Error('No refresh token available');

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    const data = await res.json();
    if (!data.access_token) throw new Error('Failed to refresh access token');

    integration.access_token = data.access_token;
    integration.expires_at = Date.now() + data.expires_in * 1000;
    taskService.setIntegration(userId, 'google_calendar', integration);

    return data.access_token;
  }

  // Get valid access token, refresh if expired
  async getValidAccessToken(userId) {
    const integration = taskService.getIntegration(userId, 'google_calendar');
    if (!integration) throw new Error('Google Calendar not connected');

    if (!integration.access_token || Date.now() > integration.expires_at - 60000) {
      return await this.refreshAccessToken(userId);
    }

    return integration.access_token;
  }

  // Fetch events from a single calendar
  async fetchEventsFromCalendar(accessToken, calendarId, timeMin, timeMax) {
    const url = `${this.apiUrl}/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime${
      timeMin ? `&timeMin=${encodeURIComponent(timeMin)}` : ''
    }${timeMax ? `&timeMax=${encodeURIComponent(timeMax)}` : ''}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.status} ${JSON.stringify(data)}`);
    return data.items || [];
  }

  // Get events for user (primary first, then all calendars)
  async getEvents(userId, timeMin = null, timeMax = null) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
  
      // 1. Get list of all calendars
      const calRes = await fetch(`${this.apiUrl}/users/me/calendarList`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const calData = await calRes.json();
      if (!calData.items) return [];
  
      const allEvents = [];
  
      for (const cal of calData.items) {
        // Skip Google holiday calendars
        if (cal.id.includes('holiday@group.v.calendar.google.com')) continue;
  
        const events = await this.fetchEventsFromCalendar(
          accessToken,
          cal.id,
          timeMin,
          timeMax
        );
  
        allEvents.push(...events);
      }
  
      // Transform Google events to task format
      return this.transformEvents(allEvents);
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      throw error;
    }
  }
  
  // In calendarService.js
  async createEvent(userId, task) {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) throw new Error('Google Calendar not connected');

    // Map your task to Google Calendar event format
    const eventData = {
      summary: task.title,
      description: task.description || '',
      start: {
        dateTime: task.dueAt || new Date().toISOString(), // fallback if no due date
        timeZone: 'UTC'
      },
      end: {
        dateTime: task.dueAt
          ? new Date(new Date(task.dueAt).getTime() + 30 * 60 * 1000).toISOString() // default 30 min
          : new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        timeZone: 'UTC'
      }
    };

    const response = await fetch(`${this.apiUrl}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create Google Calendar event: ${text}`);
    }

    const createdEvent = await response.json();
    return {
      id: createdEvent.id,
      externalId: createdEvent.id,
      source: 'google_calendar',
      ...task
    };
  }

  // Transform Google events to task format
  transformEvents(items) {
    return items.map(event => ({
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
    }));
  }

  mapEventToCategory(event) {
    const summary = (event.summary || '').toLowerCase();
    const description = (event.description || '').toLowerCase();

    if (summary.includes('study') || summary.includes('learn') || description.includes('study')) return 'STUDY';
    if (summary.includes('workout') || summary.includes('exercise') || summary.includes('gym')) return 'HEALTH';
    if (summary.includes('project') || summary.includes('code') || summary.includes('dev')) return 'PROJECT';
    return 'MISC';
  }

  getEventStatus(event) {
    const now = new Date();
    const endTime = event.end?.dateTime || event.end?.date;
    if (!endTime) return 'TODO';
    return new Date(endTime) < now ? 'DONE' : 'TODO';
  }

  getEventCompletedAt(event) {
    const now = new Date();
    const endTime = event.end?.dateTime || event.end?.date;
    if (!endTime) return null;
    return new Date(endTime) < now ? endTime : null;
  }
}

export default new CalendarService();
