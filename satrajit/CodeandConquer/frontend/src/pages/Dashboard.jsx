import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useGame } from '../contexts/GameContext'
import { usePayment } from '../contexts/PaymentContext'
import { useNavigate } from 'react-router-dom'
import { 
  Bell, 
  Zap, 
  Coins, 
  Flame, 
  Building2, 
  Award, 
  LineChart,
  Star,
  ChevronDown,
  CheckCircle2,
  Calendar,
  ListTodo
} from 'lucide-react'
import Matchmaking from '../components/Matchmaking'
import PricingModal from '../components/PricingModal'
import ProfileSettings from '../components/ProfileSettings'
import TaskPanel from '../components/TaskPanel'
import './Dashboard.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { stats } = useGame()
  const { isPremium } = usePayment()
  const navigate = useNavigate()
  const [showMatchmaking, setShowMatchmaking] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [tasks, setTasks] = useState([])
  const [taskBuffs, setTaskBuffs] = useState(null)

  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'

  useEffect(() => {
    if (user) {
      loadTasks()
      loadTaskBuffs()
    }
  }, [user])

  // Check for OAuth success messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('todoist') === 'connected' || params.get('calendar') === 'connected') {
      loadTasks()
      loadTaskBuffs()
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks?playerId=${user.id}`)
      const data = await response.json()
      setTasks(data || [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const loadTaskBuffs = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks/buffs/${user.id}`)
      const data = await response.json()
      setTaskBuffs(data)
    } catch (error) {
      console.error('Failed to load task buffs:', error)
    }
  }

  const completedTasks = tasks.filter(t => t.status === 'DONE').length
  const totalTasks = tasks.length

  return (
    <div className="dashboard-page">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="welcome-section">
          <h1>Welcome Back, {displayName}!</h1>
          <p>Ready to level up your coding skills?</p>
        </div>
        <div className="top-bar-actions">
          <div className="stat-badge">
            <Zap size={16} />
            <span>{stats.xp || 0} XP</span>
          </div>
          <div className="stat-badge">
            <Coins size={16} />
            <span>{stats.coins || 0}</span>
          </div>
          <button className="notification-btn">
            <Bell size={20} />
            <span className="notification-dot"></span>
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <LineChart size={20} className="stat-icon" />
            <span className="stat-change positive">+12%</span>
          </div>
          <div className="stat-value">{stats.problemsSolved || 0}</div>
          <div className="stat-label">Problems Solved</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <Flame size={20} className="stat-icon flame" />
            <span className="stat-badge-small">Active</span>
          </div>
          <div className="stat-value">23</div>
          <div className="stat-label">Day Streak</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <Building2 size={20} className="stat-icon tower" />
            <span className="stat-badge-small">+3 New</span>
          </div>
          <div className="stat-value">18</div>
          <div className="stat-label">Towers Unlocked</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <Award size={20} className="stat-icon award" />
            <span className="stat-badge-small">#247</span>
          </div>
          <div className="stat-value">1,847</div>
          <div className="stat-label">Global Rank</div>
        </div>
      </div>

      {/* XP Progress Section */}
      <div className="xp-progress-section">
        <div className="section-header">
          <div>
            <h2>XP Progress</h2>
            <p>Track your weekly coding activity</p>
          </div>
          <div className="time-selector">
            <span>Last 7 Days</span>
            <ChevronDown size={16} />
          </div>
        </div>
        <div className="xp-chart-placeholder">
          <LineChart size={48} opacity={0.3} />
          <p>Chart will be displayed here</p>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="tasks-section">
        <div className="section-header">
          <div>
            <div className="section-title-with-icon">
              <ListTodo size={20} />
              <h2>Tasks</h2>
            </div>
            <p>Complete tasks to earn match buffs</p>
          </div>
          <button onClick={() => setShowTasks(true)} className="view-all-btn">
            View All
          </button>
        </div>
        <div className="tasks-grid">
          <div className="task-summary-card">
            <div className="task-summary-header">
              <CheckCircle2 size={20} className="task-icon" />
              <span className="task-count">{completedTasks}/{totalTasks}</span>
            </div>
            <div className="task-summary-label">Tasks Completed</div>
            {taskBuffs && (
              <div className="task-buffs-preview">
                <div className="buff-item">+{taskBuffs.startingEnergyBonus} Energy</div>
                <div className="buff-item">+{taskBuffs.baseHpBonusPercent}% HP</div>
                <div className="buff-item">+{taskBuffs.bonusTowerSlots} Slots</div>
              </div>
            )}
          </div>
          <div className="task-list-preview">
            {tasks.slice(0, 3).map(task => (
              <div key={task.id} className={`task-preview-item ${task.status === 'DONE' ? 'done' : ''}`}>
                <div className="task-preview-content">
                  <div className="task-preview-title-row">
                    <div className="task-preview-title">{task.title}</div>
                    {task.source && (
                      <span className="task-source-badge">
                        {task.source === 'todoist' ? <ListTodo size={12} /> : <Calendar size={12} />}
                        {task.source === 'todoist' ? 'Todoist' : 'Calendar'}
                      </span>
                    )}
                  </div>
                  <div className="task-preview-meta">
                    <span className={`task-preview-category ${task.category}`}>{task.category}</span>
                  </div>
                </div>
                {task.status === 'DONE' && <CheckCircle2 size={16} className="task-check" />}
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="task-empty">No tasks yet. Connect Todoist or Google Calendar!</div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Challenge */}
      <div className="daily-challenge-section">
        <div className="section-header">
          <div>
            <div className="section-title-with-icon">
              <Star size={20} />
              <h2>Daily Challenge</h2>
            </div>
            <p>Expires in 8h 23m</p>
          </div>
        </div>
        <div className="challenge-card">
          <h3>Binary Tree Traversal</h3>
          <p>Implement an in-order traversal algorithm for a binary tree structure.</p>
          <div className="challenge-tags">
            <span className="tag medium">Medium</span>
            <span className="tag topic">Trees</span>
          </div>
          <div className="challenge-rewards">
            <div className="reward-item">
              <Zap size={16} />
              <span>+500 XP</span>
            </div>
            <div className="reward-item">
              <Coins size={16} />
              <span>+200</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="actions-grid">
        <div className="action-minimal" onClick={() => navigate('/problems')}>
          <div className="action-title">Practice</div>
          <div className="action-subtitle">Solve coding challenges</div>
        </div>
        <div className="action-minimal" onClick={() => setShowMatchmaking(true)}>
          <div className="action-title">1v1 Battle</div>
          <div className="action-subtitle">Compete in real-time matches</div>
        </div>
      </div>

      {showMatchmaking && (
        <Matchmaking 
          onClose={() => setShowMatchmaking(false)}
          onMatchFound={(opponent) => {
            setShowMatchmaking(false)
            navigate('/match', { state: { mode: '1v1', opponent, fromMatchmaking: true } })
          }}
        />
      )}
      
      {showPricing && (
        <PricingModal onClose={() => setShowPricing(false)} />
      )}
      
      {showSettings && (
        <ProfileSettings onClose={() => setShowSettings(false)} />
      )}

      {showTasks && (
        <TaskPanel 
          onClose={() => {
            setShowTasks(false)
            loadTasks()
            loadTaskBuffs()
          }}
          onTaskComplete={(taskId) => {
            loadTasks()
            loadTaskBuffs()
          }}
        />
      )}
    </div>
  )
}
