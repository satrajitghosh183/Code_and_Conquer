import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useGame } from '../contexts/GameContext'
import { usePayment } from '../contexts/PaymentContext'
import { 
  Code2, 
  Gamepad2, 
  Trophy, 
  LineChart,
  Crown,
  MoreVertical,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import PricingModal from './PricingModal'
import ProfileSettings from './ProfileSettings'
import './Layout.css'

export default function Layout({ children }) {
  const { user, profile, signOut: authSignOut } = useAuth()
  const { stats } = useGame()
  const { isPremium } = usePayment()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPricing, setShowPricing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    const { error } = await authSignOut()
    if (!error) {
      navigate('/login')
    }
  }

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null
  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'
  const currentPath = location.pathname

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LineChart },
    { path: '/problems', label: 'Problems', icon: Code2 },
    { path: '/play', label: 'Play Game', icon: Gamepad2 },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-menu-container')) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showProfileMenu])

  return (
    <div className="layout-container">
      {/* Mobile menu toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar overlay for mobile */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Code2 size={24} className="logo-icon" />
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPath === item.path
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path)
                  setSidebarOpen(false)
                }}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {!isPremium && (
          <div className="upgrade-section">
            <div className="upgrade-icon">
              <Crown size={20} />
            </div>
            <div className="upgrade-content">
              <div className="upgrade-title">Upgrade to Pro</div>
              <div className="upgrade-subtitle">Unlock exclusive towers and bonuses</div>
              <button className="upgrade-btn" onClick={() => setShowPricing(true)}>Upgrade Now</button>
            </div>
          </div>
        )}

        <div className="user-profile">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" />
            ) : (
              <span>{(displayName || 'U')[0].toUpperCase()}</span>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-name">{displayName}</div>
            <div className="profile-level">Level {stats.level} Coder</div>
          </div>
          <div className="profile-menu-container">
            <button 
              className="profile-menu"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <MoreVertical size={20} />
            </button>
            {showProfileMenu && (
              <div className="profile-dropdown">
                <button onClick={() => { setShowSettings(true); setShowProfileMenu(false); }}>
                  <Settings size={16} />
                  Settings
                </button>
                <button onClick={() => { handleSignOut(); setShowProfileMenu(false); }}>
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {showPricing && (
        <PricingModal onClose={() => setShowPricing(false)} />
      )}
      
      {showSettings && (
        <ProfileSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

