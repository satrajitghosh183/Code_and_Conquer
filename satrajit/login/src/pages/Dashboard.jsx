import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import ProfileSettings from '../components/ProfileSettings'
import './Dashboard.css'

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      navigate('/login')
    }
  }

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const displayName = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0]

  return (
    <>
      <div className="dashboard">
        <nav className="dashboard-nav">
          <h1>⚔️ Code & Conquer</h1>
          <div className="user-info">
            <div className="user-avatar" onClick={() => setShowSettings(true)}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" />
              ) : (
                <span>{(displayName || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <span className="username">{displayName}</span>
            <button onClick={() => setShowSettings(true)} className="settings-btn">
              ⚙️ Settings
            </button>
            <button onClick={handleSignOut} className="signout-btn">
              🚪 Sign Out
            </button>
          </div>
        </nav>
        
        <div className="dashboard-content">
          <div className="welcome-section">
            <h2>🎯 Welcome Back, {displayName}!</h2>
            <p>Ready to conquer some code challenges?</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-info">
                <h3>0</h3>
                <p>Challenges Completed</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-info">
                <h3>0</h3>
                <p>Current Streak</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎖️</div>
              <div className="stat-info">
                <h3>Beginner</h3>
                <p>Rank</p>
              </div>
            </div>
          </div>

          <div className="challenges-section">
            <h3>🚀 Start Your Journey</h3>
            <div className="challenge-list">
              <div className="challenge-card">
                <div className="challenge-header">
                  <span className="difficulty easy">Easy</span>
                  <span className="points">+10 XP</span>
                </div>
                <h4>Two Sum</h4>
                <p>Find two numbers that add up to a target value</p>
                <button className="start-btn">Start Challenge</button>
              </div>
              <div className="challenge-card">
                <div className="challenge-header">
                  <span className="difficulty medium">Medium</span>
                  <span className="points">+25 XP</span>
                </div>
                <h4>Reverse Linked List</h4>
                <p>Reverse a singly linked list iteratively or recursively</p>
                <button className="start-btn">Start Challenge</button>
              </div>
              <div className="challenge-card">
                <div className="challenge-header">
                  <span className="difficulty hard">Hard</span>
                  <span className="points">+50 XP</span>
                </div>
                <h4>Merge K Sorted Lists</h4>
                <p>Merge K sorted linked lists into one sorted list</p>
                <button className="start-btn">Start Challenge</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSettings && <ProfileSettings onClose={() => setShowSettings(false)} />}
    </>
  )
}