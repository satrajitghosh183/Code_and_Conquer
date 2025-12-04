// Todoist API integration service
class TodoistService {
  constructor() {
    this.apiUrl = 'https://api.todoist.com/rest/v2'
  }

  // Get tasks from Todoist
  async getTasks(accessToken) {
    try {
      const response = await fetch(`${this.apiUrl}/tasks`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Todoist API error: ${response.status}`)
      }

      const tasks = await response.json()
      
      // Transform Todoist tasks to our format
      return tasks.map(task => ({
        id: task.id,
        title: task.content,
        description: task.description || '',
        category: this.mapProjectToCategory(task.project_id),
        status: task.is_completed ? 'DONE' : 'TODO',
        createdAt: task.created_at,
        dueAt: task.due?.date || null,
        completedAt: task.completed_at || null,
        source: 'todoist',
        externalId: task.id
      }))
    } catch (error) {
      console.error('Error fetching Todoist tasks:', error)
      throw error
    }
  }

  // Complete a task in Todoist
  async completeTask(accessToken, taskId) {
    try {
      const response = await fetch(`${this.apiUrl}/tasks/${taskId}/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Todoist API error: ${response.status}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Error completing Todoist task:', error)
      throw error
    }
  }

  // Map Todoist project to our category
  mapProjectToCategory(projectId) {
    // This would ideally fetch project names, but for MVP we'll use defaults
    // In production, you'd maintain a mapping of project IDs to categories
    return 'MISC'
  }
}

export default new TodoistService()

