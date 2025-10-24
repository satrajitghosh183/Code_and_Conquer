import express from "express";
import session from "cookie-session";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = 3000;

app.use(session({
  name: 'session',
  keys: [process.env.SESSION_SECRET],
  maxAge: 24 * 60 * 60 * 1000,
}));

// === HOMEPAGE ROUTE ===
app.get("/", (req, res) => {
    res.send(`
      <h2>Todoist Backend</h2>
      <a href="/auth/todoist">Login with Todoist</a><br>
      <a href="/tasks">View Tasks</a><br>
      <a href="/create-task">Create Task</a>
    `);
  });
  
// Redirect user to Todoist login
app.get("/auth/todoist", (req, res) => {
  const url = `https://todoist.com/oauth/authorize?client_id=${process.env.TODOIST_CLIENT_ID}&scope=data:read_write&state=secretstate&redirect_uri=http://localhost:3000/auth/todoist/callback`;
  res.redirect(url);
});

// Handle callback
app.get("/auth/todoist/callback", async (req, res) => {
  const code = req.query.code;

  const response = await axios.post("https://todoist.com/oauth/access_token", {
    client_id: process.env.TODOIST_CLIENT_ID,
    client_secret: process.env.TODOIST_CLIENT_SECRET,
    code,
    redirect_uri: "http://localhost:3000/auth/todoist/callback"
  });

  req.session.token = response.data.access_token;
  res.redirect("/tasks");
});

// Fetch tasks
app.get("/tasks", async (req, res) => {
  if (!req.session.token) return res.redirect("/auth/todoist");

  const tasks = await axios.get("https://api.todoist.com/rest/v2/tasks", {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });

  res.send(tasks.data);
});

// Create task
app.get("/create-task", async (req, res) => {
  if (!req.session.token) return res.redirect("/auth/todoist");

  const task = {
    content: "Demo Task",
    due_string: "tomorrow",
  };

  const response = await axios.post("https://api.todoist.com/rest/v2/tasks", task, {
    headers: { Authorization: `Bearer ${req.session.token}` }
  });

  res.send(`Task created: ${response.data.id}`);
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
