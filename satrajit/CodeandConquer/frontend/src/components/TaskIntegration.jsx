import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, ListTodo, X } from 'lucide-react'
import './TaskIntegration.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function TaskIntegration({ onClose, onConnected }) {
  const { user } = useAuth()
  const [connecting, setConnecting] = useState(null)

  const handleTodoistConnect = () => {
    setConnecting('todoist')
    // Redirect to backend OAuth endpoint which will handle Todoist OAuth
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
    window.location.href = `${backendUrl}/auth/todoist/connect?userId=${user.id}`
  }

  const handleGoogleCalendarConnect = () => {
    setConnecting('calendar')
    // Redirect to backend OAuth endpoint which will handle Google OAuth
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
    window.location.href = `${backendUrl}/auth/google-calendar/connect?userId=${user.id}`
  }

  return (
    <div className="integration-overlay" onClick={onClose}>
      <div className="integration-modal" onClick={(e) => e.stopPropagation()}>
        <div className="integration-header">
          <h3>Connect Task Sources</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="integration-content">
          <p className="integration-description">
            Connect your task management tools to automatically sync tasks and earn match buffs!
          </p>

          <div className="integration-options">
            <div className="integration-card">
              <div className="integration-icon">
                <ListTodo size={32} />
              </div>
              <h4>Todoist</h4>
              <p>Sync your Todoist tasks automatically</p>
              <button 
                onClick={handleTodoistConnect}
                className="connect-btn"
                disabled={connecting === 'todoist'}
              >
                {connecting === 'todoist' ? 'Connecting...' : 'Connect Todoist'}
              </button>
            </div>

            <div className="integration-card">
              <div className="integration-icon">
                <Calendar size={32} />
              </div>
              <h4>Google Calendar</h4>
              <p>Import events from your calendar</p>
              <button 
                onClick={handleGoogleCalendarConnect}
                className="connect-btn"
                disabled={connecting === 'calendar'}
              >
                {connecting === 'calendar' ? 'Connecting...' : 'Connect Calendar'}
              </button>
            </div>
          </div>

          <div className="integration-info">
            <p className="info-text">
              Tasks completed in the last 7 days will give you buffs in matches:
            </p>
            <ul className="buffs-list">
              <li>+5 Starting Energy per 20 task points</li>
              <li>+2% Base HP per 30 task points (max 20%)</li>
              <li>+1 Tower Slot per 40 task points (max 3)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

