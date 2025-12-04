import express from 'express';
import taskService from '../services/taskService.js';

const router = express.Router();

// Todoist OAuth connect (initiate OAuth flow)
router.get('/todoist/connect', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=missing_user`);
  }

  const clientId = process.env.TODOIST_CLIENT_ID;
  if (!clientId) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=todoist_not_configured`);
  }
  const redirectUri = `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/todoist/callback`;
  const scope = 'task:read,data:read';
  const state = userId;

  res.redirect(`https://todoist.com/oauth/authorize?client_id=${clientId}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`);
});

// Google Calendar OAuth connect (initiate OAuth flow)
router.get('/google-calendar/connect', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=missing_user`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=google_not_configured`);
  }
  const redirectUri = `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/google-calendar/callback`;
  const scope = 'https://www.googleapis.com/auth/calendar.readonly';
  const state = userId;

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`);
});

// Todoist OAuth callback
router.get('/todoist/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    
    if (!code || !userId) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=oauth_failed`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://todoist.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.TODOIST_CLIENT_ID,
        client_secret: process.env.TODOIST_CLIENT_SECRET,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Todoist token exchange error:', errorText);
      throw new Error('Failed to exchange Todoist code');
    }

    const { access_token } = await tokenResponse.json();

    if (!access_token) {
      throw new Error('No access token received');
    }

    // Store token for user
    taskService.setIntegration(userId, 'todoist', access_token);

    // Redirect to dashboard
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?todoist=connected`);
  } catch (error) {
    console.error('Todoist OAuth error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=oauth_failed`);
  }
});

// Google Calendar OAuth callback
router.get('/google-calendar/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    
    if (!code || !userId) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=oauth_failed`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/google-calendar/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Google token exchange error:', errorText);
      throw new Error('Failed to exchange Google code');
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    if (!access_token) {
      throw new Error('No access token received');
    }

    // Store token for user
    taskService.setIntegration(userId, 'google_calendar', access_token);

    // Redirect to dashboard
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?calendar=connected`);
  } catch (error) {
    console.error('Google Calendar OAuth error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?error=oauth_failed`);
  }
});

export default router;

