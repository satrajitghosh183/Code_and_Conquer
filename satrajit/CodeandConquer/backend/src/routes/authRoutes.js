import express from 'express';
import taskService from '../services/taskService.js';

const router = express.Router();

// Helper to get server URL for OAuth callbacks
const getServerUrl = () => {
  const url = (process.env.SERVER_URL || 'http://localhost:5000').replace(/\/$/, '');
  return url;
};

// Helper to get client URL for redirects
const getClientUrl = () => {
  return (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
};

// Check OAuth configuration status
router.get('/status', (req, res) => {
  res.json({
    todoist: {
      configured: !!(process.env.TODOIST_CLIENT_ID && process.env.TODOIST_CLIENT_SECRET)
    },
    google_calendar: {
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    },
    serverUrl: getServerUrl(),
    clientUrl: getClientUrl()
  });
});

// Todoist OAuth connect (initiate OAuth flow)
router.get('/todoist/connect', (req, res) => {
  const { userId } = req.query;
  console.log('[Todoist OAuth] Connect request for user:', userId);
  
  if (!userId) {
    console.error('[Todoist OAuth] Missing user ID');
    return res.redirect(`${getClientUrl()}/dashboard?error=missing_user`);
  }

  const clientId = process.env.TODOIST_CLIENT_ID;
  if (!clientId) {
    console.error('[Todoist OAuth] TODOIST_CLIENT_ID not configured');
    return res.redirect(`${getClientUrl()}/dashboard?error=todoist_not_configured`);
  }

  const redirectUri = `${getServerUrl()}/auth/todoist/callback`;
  const scope = 'data:read_write';
  const state = userId;

  console.log('[Todoist OAuth] Redirect URI:', redirectUri);
  console.log('[Todoist OAuth] Client ID:', clientId.substring(0, 8) + '...');

  res.redirect(
    `https://todoist.com/oauth/authorize?client_id=${clientId}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`
  );
});

// Google Calendar OAuth connect
router.get('/google-calendar/connect', (req, res) => {
  const { userId } = req.query;
  console.log('[Google Calendar OAuth] Connect request for user:', userId);
  
  if (!userId) {
    console.error('[Google Calendar OAuth] Missing user ID');
    return res.redirect(`${getClientUrl()}/dashboard?error=missing_user`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('[Google Calendar OAuth] GOOGLE_CLIENT_ID not configured');
    return res.redirect(`${getClientUrl()}/dashboard?error=google_not_configured`);
  }

  const redirectUri = `${getServerUrl()}/auth/google-calendar/callback`;
  
  // Request full calendar access for read + write
  const scope = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ].join(' ');
  
  const state = userId;

  console.log('[Google Calendar OAuth] Redirect URI:', redirectUri);
  console.log('[Google Calendar OAuth] Client ID:', clientId.substring(0, 15) + '...');

  // Important: access_type=offline and prompt=consent to get refresh_token
  res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`
  );
});

// Todoist OAuth callback
router.get('/todoist/callback', async (req, res) => {
  console.log('[Todoist OAuth] Callback received');
  try {
    const { code, state: userId, error } = req.query;

    if (error) {
      console.error('[Todoist OAuth] Error from Todoist:', error);
      return res.redirect(`${getClientUrl()}/dashboard?error=oauth_denied`);
    }

    if (!code || !userId) {
      console.error('[Todoist OAuth] Missing code or userId');
      return res.redirect(`${getClientUrl()}/dashboard?error=oauth_failed`);
    }

    console.log('[Todoist OAuth] Exchanging code for token, userId:', userId);

    const tokenResponse = await fetch('https://todoist.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.TODOIST_CLIENT_ID,
        client_secret: process.env.TODOIST_CLIENT_SECRET,
        code
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Todoist OAuth] Token exchange error:', errorText);
      throw new Error('Failed to exchange Todoist code');
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;
    
    if (!access_token) {
      console.error('[Todoist OAuth] No access token in response:', tokenData);
      throw new Error('No access token received');
    }

    console.log('[Todoist OAuth] Token received, setting integration');
    taskService.setIntegration(userId, 'todoist', access_token);

    // Try to fetch tasks immediately to verify integration works
    try {
      const tasks = await taskService.getTasks(userId);
      console.log(`[Todoist OAuth] Successfully fetched ${tasks.length} tasks for user ${userId}`);
    } catch (fetchError) {
      console.warn('[Todoist OAuth] Could not pre-fetch tasks:', fetchError.message);
    }

    res.redirect(`${getClientUrl()}/dashboard?todoist=connected`);
  } catch (error) {
    console.error('[Todoist OAuth] Error:', error);
    res.redirect(`${getClientUrl()}/dashboard?error=oauth_failed`);
  }
});

// Google Calendar OAuth callback
router.get('/google-calendar/callback', async (req, res) => {
  console.log('[Google Calendar OAuth] Callback received');
  try {
    const { code, state: userId, error: oauthError } = req.query;

    if (oauthError) {
      console.error('[Google Calendar OAuth] Error from Google:', oauthError);
      return res.redirect(`${getClientUrl()}/dashboard?error=oauth_denied`);
    }

    if (!code || !userId) {
      console.error('[Google Calendar OAuth] Missing code or userId');
      return res.redirect(`${getClientUrl()}/dashboard?error=oauth_failed`);
    }

    console.log('[Google Calendar OAuth] Exchanging code for token, userId:', userId);

    const redirectUri = `${getServerUrl()}/auth/google-calendar/callback`;
    console.log('[Google Calendar OAuth] Using redirect_uri:', redirectUri);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Google Calendar OAuth] Token exchange error:', errorText);
      throw new Error('Failed to exchange Google code: ' + errorText);
    }

    const data = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = data;
    
    if (!access_token) {
      console.error('[Google Calendar OAuth] No access token in response:', data);
      throw new Error('No access token received');
    }

    console.log('[Google Calendar OAuth] Token received, setting integration');
    console.log('[Google Calendar OAuth] Got refresh_token:', !!refresh_token);
    
    // Store the full token object including refresh_token
    taskService.setIntegration(userId, 'google_calendar', {
      access_token,
      refresh_token: refresh_token || null, // May be null if already authorized before
      expires_at: Date.now() + (expires_in || 3600) * 1000
    });
    
    // Try to fetch tasks immediately to verify integration works
    try {
      const calendarTasks = await taskService.getTasks(userId);
      console.log(`[Google Calendar OAuth] Successfully fetched ${calendarTasks.length} tasks for user ${userId}`);
    } catch (fetchError) {
      console.warn('[Google Calendar OAuth] Could not pre-fetch tasks:', fetchError.message);
    }
    
    // Redirect back to dashboard
    res.redirect(`${getClientUrl()}/dashboard?calendar=connected`);
  } catch (error) {
    console.error('[Google Calendar OAuth] Error:', error);
    res.redirect(`${getClientUrl()}/dashboard?error=oauth_failed`);
  }
});

export default router;
