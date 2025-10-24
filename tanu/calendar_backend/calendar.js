import dotenv from "dotenv";
dotenv.config();

import express from "express";
import session from "cookie-session";
import { google } from "googleapis";

const app = express();
const port = 3000;

// === ENABLE SESSIONS ===
app.use(session({
  name: 'session',
  keys: [process.env.SESSION_SECRET],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
}));

// === CONFIGURE GOOGLE OAUTH ===
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "http://localhost:3000/auth/google/callback"
);
  
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

// === HOMEPAGE ROUTE ===
app.get("/", (req, res) => {
    res.send(`
      <h2>Calendar Backend</h2>
      <a href="/auth/google">Login with Google</a><br>
      <a href="/events">View Events</a><br>
      <a href="/create-event">Create Event</a>
    `);
});

// === STEP 1: Redirect user to Google Sign-in ===
app.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  res.redirect(url);
});

// === STEP 2: Handle Google callback ===
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oauth2Client.getToken(code);
  req.session.tokens = tokens;
  res.redirect("/events");
});

// === STEP 3: Fetch events from Google Calendar ===
app.get("/events", async (req, res) => {
  if (!req.session.tokens) return res.redirect("/auth/google");

  oauth2Client.setCredentials(req.session.tokens);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const events = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 5,
    singleEvents: true,
    orderBy: "startTime",
  });

  res.send(events.data.items);
});

// === STEP 4: Create a new event ===
app.get("/create-event", async (req, res) => {
  if (!req.session.tokens) return res.redirect("/auth/google");

  oauth2Client.setCredentials(req.session.tokens);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = {
    summary: "Demo Meeting",
    start: { dateTime: new Date().toISOString(), timeZone: "America/New_York" },
    end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), timeZone: "America/New_York" },
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });

  res.send(`Event created: ${response.data.htmlLink}`);
});

// === START SERVER ===
app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
