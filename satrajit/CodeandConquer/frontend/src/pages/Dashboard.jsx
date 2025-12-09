import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useGame } from '../contexts/GameContext'
import { usePayment } from '../contexts/PaymentContext'
import { useNotifications } from '../contexts/NotificationContext'
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
import NotificationPanel from '../components/NotificationPanel'
import { formatMarkdown } from '../utils/markdown'
import './Dashboard.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { stats, refreshStats } = useGame()
  const { isPremium } = usePayment()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const [showMatchmaking, setShowMatchmaking] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [tasks, setTasks] = useState([])
  const [taskBuffs, setTaskBuffs] = useState(null)
  const [dashboardStats, setDashboardStats] = useState({
    problemsSolved: 0,
    dayStreak: 0,
    towersUnlocked: 0,
    globalRank: null,
    rankScore: 0
  })
  const [dailyChallenge, setDailyChallenge] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [xpHistory, setXpHistory] = useState(null)
  const [loadingXpHistory, setLoadingXpHistory] = useState(true)
  const [xpPeriod, setXpPeriod] = useState(7)
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.notification-wrapper')) {
        setShowNotifications(false)
      }
      if (!e.target.closest('.period-selector-wrapper')) {
        setShowPeriodDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    if (user) {
      loadTasks()
      loadTaskBuffs()
      loadDashboardStats()
      loadDailyChallenge()
      loadXpHistory()
    }
  }, [user])

  // Refresh dashboard stats when GameContext stats change (after solving problems)
  useEffect(() => {
    if (user && stats && stats.xp > 0) {
      console.log('[Dashboard] GameContext stats changed, refreshing dashboard stats:', stats)
      loadDashboardStats()
      loadXpHistory() // Also refresh XP chart
    }
  }, [stats?.xp, stats?.coins, stats?.problemsSolved, user])

  // Check for OAuth success messages
  useEffect(() => {
    if (!user?.id) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('todoist') === 'connected' || params.get('calendar') === 'connected') {
      loadTasks()
      loadTaskBuffs()
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [user])

  const loadTasks = async () => {
    if (!user?.id) return
    try {
      const response = await fetch(`${API_URL}/tasks?playerId=${user.id}`)
      if (!response.ok) {
        throw new Error(`Failed to load tasks: ${response.statusText}`)
      }
      const data = await response.json()
      setTasks(data || [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
      setTasks([]) // Set empty array on error
    }
  }

  const loadTaskBuffs = async () => {
    if (!user?.id) return
    try {
      const response = await fetch(`${API_URL}/tasks/buffs/${user.id}`)
      if (!response.ok) {
        throw new Error(`Failed to load task buffs: ${response.statusText}`)
      }
      const data = await response.json()
      setTaskBuffs(data)
    } catch (error) {
      console.error('Failed to load task buffs:', error)
      setTaskBuffs(null) // Set null on error
    }
  }

  const loadDashboardStats = async () => {
    if (!user?.id) return
    try {
      setLoadingStats(true)
      // First try to get stats from user_stats table (same as GameContext)
      const statsResponse = await fetch(`${API_URL}/users/${user.id}/stats`)
      let userStatsData = null
      if (statsResponse.ok) {
        userStatsData = await statsResponse.json()
        console.log('[Dashboard] User stats from API:', userStatsData)
      } else {
        console.warn('[Dashboard] Failed to load stats from API:', statsResponse.status, statsResponse.statusText)
        
        // Fallback: Direct Supabase query
        try {
          const { supabase } = await import('../config/supabaseClient')
          const { data: supabaseData, error: supabaseError } = await supabase
            .from('user_stats')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (!supabaseError && supabaseData) {
            console.log('[Dashboard] User stats from Supabase:', supabaseData)
            console.log('[Dashboard] Supabase coins:', supabaseData.coins, 'Type:', typeof supabaseData.coins)
            userStatsData = { data: supabaseData }
          } else {
            console.error('[Dashboard] Supabase error:', supabaseError)
          }
        } catch (err) {
          console.error('[Dashboard] Supabase fallback error:', err)
        }
      }
      
      // Then get dashboard-specific stats (rank, streak, etc.)
      const response = await fetch(`${API_URL}/dashboard/stats/${user.id}`)
      let dashboardData = null
      if (response.ok) {
        dashboardData = await response.json()
      }
      
      // Extract coins and xp with proper parsing
      const rawCoins = userStatsData?.data?.coins || userStatsData?.coins || dashboardData?.coins
      const rawXp = userStatsData?.data?.xp || userStatsData?.xp || dashboardData?.xp
      
      const coins = parseInt(rawCoins) || parseInt(stats?.coins) || 0
      const xp = parseInt(rawXp) || parseInt(stats?.xp) || 0
      
      console.log('[Dashboard] Raw coins from API:', rawCoins, 'Parsed:', coins)
      console.log('[Dashboard] Raw XP from API:', rawXp, 'Parsed:', xp)
      
      // Merge both sources, prioritizing user_stats for coins/xp/problemsSolved
      setDashboardStats({
        problemsSolved: parseInt(userStatsData?.data?.problems_solved) || parseInt(userStatsData?.data?.problemsSolved) || parseInt(dashboardData?.problemsSolved) || parseInt(stats?.problemsSolved) || 0,
        dayStreak: parseInt(dashboardData?.dayStreak) || 0,
        towersUnlocked: parseInt(dashboardData?.towersUnlocked) || 0,
        globalRank: dashboardData?.globalRank || null,
        rankScore: parseInt(dashboardData?.rankScore) || 0,
        // Also include coins and xp from user_stats
        coins: coins,
        xp: xp,
        level: parseInt(userStatsData?.data?.level) || parseInt(stats?.level) || 1
      })
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
      // Fallback to GameContext stats if available
      setDashboardStats({
        problemsSolved: stats?.problemsSolved || 0,
        dayStreak: 0,
        towersUnlocked: 0,
        globalRank: null,
        rankScore: 0,
        coins: stats?.coins || 0,
        xp: stats?.xp || 0,
        level: stats?.level || 1
      })
    } finally {
      setLoadingStats(false)
    }
  }

  const loadDailyChallenge = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/daily-challenge`)
      if (!response.ok) {
        // 404 is acceptable for daily challenge (might not be available)
        if (response.status === 404) {
          setDailyChallenge(null)
          return
        }
        throw new Error(`Failed to load daily challenge: ${response.statusText}`)
      }
      const data = await response.json()
      setDailyChallenge(data)
    } catch (error) {
      console.error('Failed to load daily challenge:', error)
      setDailyChallenge(null) // Set null on error
    }
  }

  const loadXpHistory = async (days = xpPeriod) => {
    if (!user?.id) return
    try {
      setLoadingXpHistory(true)
      const response = await fetch(`${API_URL}/dashboard/xp-history/${user.id}?days=${days}`)
      if (!response.ok) {
        throw new Error(`Failed to load XP history: ${response.statusText}`)
      }
      const data = await response.json()
      setXpHistory(data)
    } catch (error) {
      console.error('Failed to load XP history:', error)
      // Set mock data as fallback
      setXpHistory({
        history: [
          { date: 'Mon', dayName: 'Mon', xp: 0 },
          { date: 'Tue', dayName: 'Tue', xp: 0 },
          { date: 'Wed', dayName: 'Wed', xp: 0 },
          { date: 'Thu', dayName: 'Thu', xp: 0 },
          { date: 'Fri', dayName: 'Fri', xp: 0 },
          { date: 'Sat', dayName: 'Sat', xp: 0 },
          { date: 'Sun', dayName: 'Sun', xp: 0 }
        ],
        summary: { totalXP: 0, avgXP: 0, days: 7, activeDays: 0 }
      })
    } finally {
      setLoadingXpHistory(false)
    }
  }

  const completedTasks = tasks.filter(t => t.status === 'DONE').length
  const pendingTasks = tasks.filter(t => t.status !== 'DONE').length
  const totalTasks = tasks.length

  // Don't render if user is not loaded yet
  if (!user) {
    return (
      <div className="dashboard-page" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="welcome-section">
          <h1>Welcome Back, {displayName}!</h1>
          <p>Ready to level up your coding skills?</p>
        </div>
        <div className="top-bar-actions">
          <div className="stat-badge" title="Experience Points">
            <Zap size={16} />
            <span>{stats?.xp || dashboardStats?.xp || 0} XP</span>
          </div>
          <div className="stat-badge" title="Coins (Click to refresh)" onClick={() => {
            if (refreshStats) refreshStats()
            loadDashboardStats()
          }} style={{ cursor: 'pointer' }}>
            <Coins size={16} />
            <span>{stats?.coins || dashboardStats?.coins || 0} 🪙</span>
          </div>
          <div className="notification-wrapper">
            <button 
              className="notification-btn" 
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notification-dot">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationPanel 
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <LineChart size={20} className="stat-icon" />
            <span className="stat-change positive">+{dashboardStats.problemsSolved || 0}</span>
          </div>
          <div className="stat-value">{dashboardStats.problemsSolved || stats?.problemsSolved || 0}</div>
          <div className="stat-label">Problems Solved</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <Flame size={20} className="stat-icon flame" />
            <span className="stat-badge-small">{dashboardStats.dayStreak > 0 ? 'Active' : 'Start'}</span>
          </div>
          <div className="stat-value">{dashboardStats.dayStreak || 0}</div>
          <div className="stat-label">Day Streak</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <Building2 size={20} className="stat-icon tower" />
            <span className="stat-badge-small">
              {dashboardStats.towersUnlocked > 0 ? `Level ${dashboardStats.level || 1}` : 'Level 1'}
            </span>
          </div>
          <div className="stat-value">{dashboardStats.towersUnlocked || 0}</div>
          <div className="stat-label">Towers Unlocked</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <Award size={20} className="stat-icon award" />
            <span className="stat-badge-small">
              {dashboardStats.globalRank ? `#${dashboardStats.globalRank}` : 'Unranked'}
            </span>
          </div>
          <div className="stat-value">
            {dashboardStats.globalRank ? dashboardStats.globalRank.toLocaleString() : '—'}
          </div>
          <div className="stat-label">Global Rank</div>
        </div>
      </div>

      {/* XP Progress Section */}
      <div className="xp-progress-section">
        <div className="section-header">
          <div>
            <h2>XP Progress</h2>
            <p>Track your {xpPeriod === 7 ? 'weekly' : xpPeriod === 14 ? 'bi-weekly' : 'monthly'} coding activity</p>
          </div>
          <div className="period-selector-wrapper">
            <button 
              className="time-selector"
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            >
              <span>Last {xpPeriod} Days</span>
              <ChevronDown size={16} className={showPeriodDropdown ? 'rotated' : ''} />
            </button>
            {showPeriodDropdown && (
              <div className="period-dropdown">
                {[7, 14, 30].map(days => (
                  <button
                    key={days}
                    className={`period-option ${xpPeriod === days ? 'active' : ''}`}
                    onClick={() => {
                      setXpPeriod(days)
                      setShowPeriodDropdown(false)
                      loadXpHistory(days)
                    }}
                  >
                    Last {days} Days
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {loadingXpHistory ? (
          <div className="xp-chart-placeholder">
            <div className="loading-spinner-small"></div>
            <p>Loading activity...</p>
          </div>
        ) : xpHistory && xpHistory.history ? (
          <div className="xp-chart-container">
            <div className={`xp-chart ${xpPeriod > 14 ? 'very-compact' : xpPeriod > 7 ? 'compact' : ''}`}>
              {xpHistory.history.map((day, index) => {
                const maxXP = Math.max(...xpHistory.history.map(d => d.xp), 50)
                const height = day.xp > 0 ? Math.max((day.xp / maxXP) * 100, 10) : 5
                const showLabel = xpPeriod <= 14 || index % 2 === 0
                return (
                  <div key={index} className="xp-bar-wrapper" title={`${day.dayName}: ${day.xp} XP`}>
                    <div className="xp-bar-value">{day.xp > 0 ? `+${day.xp}` : ''}</div>
                    <div 
                      className={`xp-bar ${day.xp > 0 ? 'active' : ''}`}
                      style={{ height: `${height}%` }}
                    />
                    <div className="xp-bar-label">{showLabel ? day.dayName : ''}</div>
                  </div>
                )
              })}
            </div>
            {/* Commented out summary statistics - Total XP, Avg/Day, Active Days */}
            {/* <div className="xp-chart-summary">
              <div className="xp-summary-item">
                <span className="xp-summary-value">{xpHistory.summary.totalXP}</span>
                <span className="xp-summary-label">Total XP</span>
              </div>
              <div className="xp-summary-item">
                <span className="xp-summary-value">{xpHistory.summary.avgXP}</span>
                <span className="xp-summary-label">Avg/Day</span>
              </div>
              <div className="xp-summary-item">
                <span className="xp-summary-value">{xpHistory.summary.activeDays}</span>
                <span className="xp-summary-label">Active Days</span>
              </div>
            </div> */}
          </div>
        ) : (
          <div className="xp-chart-placeholder">
            <Zap size={48} opacity={0.3} />
            <p>Solve problems to earn XP!</p>
          </div>
        )}
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
              <ListTodo size={20} className="task-icon" />
              <span className="task-count">{pendingTasks}</span>
            </div>
            <div className="task-summary-label">Pending Tasks</div>
            {taskBuffs && taskBuffs.taskPoints > 0 && (
              <div className="task-buffs-preview">
                <div className="buff-item">+{taskBuffs.startingEnergyBonus || 0} Energy</div>
                <div className="buff-item">+{taskBuffs.baseHpBonusPercent || 0}% HP</div>
                <div className="buff-item">+{taskBuffs.bonusTowerSlots || 0} Slots</div>
              </div>
            )}
            {(!taskBuffs || taskBuffs.taskPoints === 0) && (
              <div className="task-buffs-hint">
                Complete tasks to earn buffs!
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
            <p>
              {dailyChallenge ? dailyChallenge.expiresIn : 'Loading...'}
            </p>
          </div>
        </div>
        {dailyChallenge ? (
          <div 
            className="challenge-card" 
            onClick={() => navigate(`/problems/${dailyChallenge.problem.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <h3>{dailyChallenge.problem.title}</h3>
            <p
              dangerouslySetInnerHTML={{
                __html: dailyChallenge.problem.description && dailyChallenge.problem.description.length > 150
                  ? formatMarkdown(dailyChallenge.problem.description.substring(0, 150) + '...')
                  : formatMarkdown(dailyChallenge.problem.description || 'Solve this daily challenge to earn bonus rewards!')
              }}
            />
            <div className="challenge-tags">
              <span className={`tag ${dailyChallenge.problem.difficulty}`}>
                {dailyChallenge.problem.difficulty ? dailyChallenge.problem.difficulty.charAt(0).toUpperCase() + dailyChallenge.problem.difficulty.slice(1) : 'Medium'}
              </span>
              {dailyChallenge.problem.firstTag && (
                <span className="tag topic">{dailyChallenge.problem.firstTag}</span>
              )}
            </div>
            <div className="challenge-rewards">
              <div className="reward-item">
                <Zap size={16} />
                <span>+{dailyChallenge.rewards?.xp || 0} XP</span>
              </div>
              <div className="reward-item">
                <Coins size={16} />
                <span>+{dailyChallenge.rewards?.coins || 0}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="challenge-card">
            <p>Loading daily challenge...</p>
          </div>
        )}
      </div>

      {/* Actions Grid */}
      <div className="actions-grid">
        <div className="action-minimal" onClick={() => navigate('/problems')}>
          <div className="action-title">Practice</div>
          <div className="action-subtitle">Solve coding challenges</div>
        </div>
        <div className="action-minimal" onClick={() => navigate('/play')}>
          <div className="action-title">Play Game</div>
          <div className="action-subtitle">Single player or multiplayer</div>
        </div>
        <div className="action-minimal" onClick={() => setShowMatchmaking(true)}>
          <div className="action-title">Quick Match</div>
          <div className="action-subtitle">Jump into 1v1 battle</div>
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
