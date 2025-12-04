/* backend/src/services/todoistService.js */

// Using native fetch (available in Node.js 18+)

class TodoistService {
  constructor() {
    this.baseUrl = "https://api.todoist.com/rest/v2";
  }

  // -----------------------------
  // Fetch all tasks
  // -----------------------------
  async getTasks(accessToken) {
    if (!accessToken) return [];
    
    // Handle both string token and object with access_token
    const token = typeof accessToken === 'string' ? accessToken : accessToken.access_token;
    if (!token) return [];

    try {
      const res = await fetch(`${this.baseUrl}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        console.error("Todoist error:", await res.text());
        return [];
      }

      const tasks = await res.json();
      return tasks.map((t) => ({
        id: t.id,
        title: t.content,
        description: t.description || "",
        dueAt: t.due?.datetime || t.due?.date || null,
        status: t.is_completed ? 'DONE' : 'TODO',
        completed: t.is_completed || false,
        completedAt: t.completed_at || null,
        category: this.mapLabelToCategory(t.labels),
        source: "todoist",
        externalId: t.id
      }));
    } catch (err) {
      console.error("Todoist fetch tasks failed:", err.message);
      return [];
    }
  }

  // Map Todoist labels to categories
  mapLabelToCategory(labels) {
    if (!labels || !Array.isArray(labels)) return 'MISC';
    
    const labelLower = labels.map(l => l.toLowerCase());
    if (labelLower.some(l => l.includes('study') || l.includes('learn'))) return 'STUDY';
    if (labelLower.some(l => l.includes('health') || l.includes('workout') || l.includes('gym'))) return 'HEALTH';
    if (labelLower.some(l => l.includes('project') || l.includes('code') || l.includes('dev'))) return 'PROJECT';
    return 'MISC';
  }

  // -----------------------------
  // Create task
  // -----------------------------
  async createTask(accessToken, data) {
    if (!accessToken) return null;
    
    const token = typeof accessToken === 'string' ? accessToken : accessToken.access_token;
    if (!token) return null;

    try {
      const res = await fetch(`${this.baseUrl}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: data.title,
          description: data.description || "",
          due_datetime: data.dueAt || data.due_at || null
        })
      });

      if (!res.ok) {
        console.error("Todoist createTask error:", await res.text());
        return null;
      }

      const task = await res.json();
      return {
        id: task.id,
        title: task.content,
        description: task.description || "",
        dueAt: task.due?.datetime || task.due?.date || null,
        status: 'TODO',
        completed: false,
        source: "todoist",
        externalId: task.id
      };
    } catch (err) {
      console.error("Todoist create task failed:", err.message);
      return null;
    }
  }

  // -----------------------------
  // Complete task
  // -----------------------------
  async completeTask(accessToken, todoistTaskId) {
    if (!accessToken) return null;
    
    const token = typeof accessToken === 'string' ? accessToken : accessToken.access_token;
    if (!token) return null;

    try {
      const res = await fetch(`${this.baseUrl}/tasks/${todoistTaskId}/close`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 204) return true;
      console.error("Todoist completeTask error:", await res.text());
      return false;
    } catch (err) {
      console.error("Todoist complete task failed:", err.message);
      return false;
    }
  }
}

export default new TodoistService();
