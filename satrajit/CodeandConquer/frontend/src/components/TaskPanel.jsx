import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { X, Plus, Check, ListTodo, Calendar, Settings, Loader2 } from 'lucide-react'
import TaskIntegration from './TaskIntegration'
import './TaskPanel.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function TaskPanel({ onClose, onTaskComplete }) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [completingTaskId, setCompletingTaskId] = useState(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showIntegration, setShowIntegration] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', category: 'MISC' })

  useEffect(() => {
    if (user) {
      loadTasks()
    }
  }, [user])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/tasks?playerId=${user.id}`)
      const data = await response.json()
      setTasks(data || [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId) => {
    if (completingTaskId) return // Prevent double-clicks
    
    setCompletingTaskId(taskId)
    console.log('[TaskPanel] Completing task:', taskId)
    
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: user.id })
      })
      
      console.log('[TaskPanel] Complete response status:', response.status)
      
      if (response.ok) {
        const completedTask = await response.json()
        console.log('[TaskPanel] Completed task response:', completedTask)
        
        // Update the task in state
        setTasks(prevTasks => prevTasks.map(t => {
          if (t.id === taskId) {
            return completedTask || { ...t, status: 'DONE', completedAt: new Date().toISOString() }
          }
          return t
        }))
        onTaskComplete?.(taskId)
      } else {
        // If task not found in DB (404), still mark as done locally for external tasks
        const errorData = await response.json().catch(() => ({}))
        console.warn('[TaskPanel] Task completion error:', errorData)
        
        // Optimistically mark as done for Todoist tasks
        setTasks(prevTasks => prevTasks.map(t => 
          t.id === taskId ? { ...t, status: 'DONE', completedAt: new Date().toISOString() } : t
        ))
        onTaskComplete?.(taskId)
      }
    } catch (error) {
      console.error('Failed to complete task:', error)
    } finally {
      setCompletingTaskId(null)
    }
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, playerId: user.id })
      })
      
      if (response.ok) {
        const task = await response.json()
        setTasks([...tasks, task])
        setNewTask({ title: '', description: '', category: 'MISC' })
        setShowAddTask(false)
      }
    } catch (error) {
      console.error('Failed to add task:', error)
    }
  }

  // Show completed tasks at the bottom
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'DONE' && b.status !== 'DONE') return 1
    if (a.status !== 'DONE' && b.status === 'DONE') return -1
    return 0
  })

  return (
    <div className="task-panel-overlay" onClick={onClose}>
      <div className="task-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>Tasks</h3>
          <div className="header-actions">
            <button onClick={() => setShowIntegration(true)} className="integrate-btn">
              <Settings size={16} />
              Connect
            </button>
            <button onClick={() => setShowAddTask(true)} className="add-btn">
              <Plus size={16} />
              Add Task
            </button>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="panel-content">
          {showAddTask && (
            <div className="add-task-form">
              <input
                type="text"
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="task-input"
              />
              <textarea
                placeholder="Description (optional)"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="task-textarea"
              />
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                className="task-select"
              >
                <option value="MISC">Misc</option>
                <option value="STUDY">Study</option>
                <option value="HEALTH">Health</option>
                <option value="PROJECT">Project</option>
              </select>
              <div className="form-actions">
                <button onClick={handleAddTask} className="save-btn">Add</button>
                <button onClick={() => setShowAddTask(false)} className="cancel-btn">Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks yet.</p>
              <button onClick={() => setShowIntegration(true)} className="connect-prompt-btn">
                Connect Todoist or Google Calendar
              </button>
              <p>or</p>
              <button onClick={() => setShowAddTask(true)} className="add-prompt-btn">
                Add a task manually
              </button>
            </div>
          ) : (
            <div className="task-list">
              {sortedTasks.map(task => (
                <div key={task.id} className={`task-item ${task.status === 'DONE' ? 'done' : ''}`}>
                  <div className="task-content">
                    <div className="task-title-row">
                      <div className="task-title">{task.title}</div>
                      {task.source && task.source !== 'internal' && (
                        <span className="task-source-badge">
                          {task.source === 'todoist' ? <ListTodo size={12} /> : <Calendar size={12} />}
                          {task.source === 'todoist' ? 'Todoist' : 'Calendar'}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <div className="task-description">{task.description}</div>
                    )}
                    <div className="task-meta">
                      <span className={`task-category ${task.category}`}>{task.category}</span>
                      {task.status === 'DONE' && (
                        <span className="task-completed">
                          ✓ Completed {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => task.status !== 'DONE' && handleCompleteTask(task.id)}
                    className={`complete-btn ${task.status === 'DONE' ? 'completed' : ''}`}
                    disabled={task.status === 'DONE' || completingTaskId === task.id}
                    title={task.status === 'DONE' ? 'Task completed' : 'Mark as complete'}
                  >
                    {completingTaskId === task.id ? (
                      <Loader2 size={16} className="spinning" />
                    ) : (
                      <Check size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showIntegration && (
        <TaskIntegration 
          onClose={() => setShowIntegration(false)}
          onConnected={() => {
            setShowIntegration(false)
            loadTasks()
          }}
        />
      )}
    </div>
  )
}
