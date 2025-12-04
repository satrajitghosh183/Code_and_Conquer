import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Trophy, Medal, Award, Crown, TrendingUp } from 'lucide-react'
import './LeaderboardPage.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, weekly, monthly

  useEffect(() => {
    loadLeaderboard()
  }, [filter])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      
      // Determine leaderboard type based on filter
      const type = filter === 'all' ? 'global' : filter === 'weekly' ? 'weekly' : 'monthly'
      
      // Fetch leaderboard from API
      const response = await fetch(`${API_URL}/leaderboard?type=${type}&limit=100`)
      
      if (!response.ok) {
        throw new Error('Failed to load leaderboard')
      }
      
      const data = await response.json()
      
      // Mark current user
      const leaderboardWithCurrentUser = data.map((entry) => ({
        ...entry,
        isCurrentUser: user && entry.userId === user.id
      }))
      
      // If current user is not in the list, fetch their position
      if (user && !leaderboardWithCurrentUser.find(e => e.userId === user.id)) {
        try {
          const userResponse = await fetch(`${API_URL}/leaderboard/user/${user.id}?type=${type}`)
          if (userResponse.ok) {
            const userEntry = await userResponse.json()
            leaderboardWithCurrentUser.push({
              ...userEntry,
              isCurrentUser: true
            })
          }
        } catch (error) {
          console.error('Failed to fetch user position:', error)
        }
      }
      
      // Sort by rank
      leaderboardWithCurrentUser.sort((a, b) => (a.rank || 999999) - (b.rank || 999999))
      
      setLeaderboard(leaderboardWithCurrentUser)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
      // Fallback to empty array on error
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={20} className="rank-icon gold" />
    if (rank === 2) return <Medal size={20} className="rank-icon silver" />
    if (rank === 3) return <Award size={20} className="rank-icon bronze" />
    return <span className="rank-number">{rank}</span>
  }

  if (loading) {
    return (
      <div className="leaderboard-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="leaderboard-page">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="welcome-section">
          <h1>Leaderboard</h1>
          <p>Compete with the best coders</p>
        </div>
      </header>

      <div className="filters">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Time
        </button>
        <button 
          className={filter === 'weekly' ? 'active' : ''}
          onClick={() => setFilter('weekly')}
        >
          This Week
        </button>
        <button 
          className={filter === 'monthly' ? 'active' : ''}
          onClick={() => setFilter('monthly')}
        >
          This Month
        </button>
      </div>

      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <div className="header-rank">Rank</div>
          <div className="header-player">Player</div>
          <div className="header-stats">
            <span>XP</span>
            <span>Level</span>
            <span>Solved</span>
            <span>Wins</span>
          </div>
        </div>

        <div className="leaderboard-list">
          {leaderboard.map((player, index) => (
            <div 
              key={index} 
              className={`leaderboard-item ${player.isCurrentUser ? 'current-user' : ''} ${player.rank <= 3 ? 'top-three' : ''}`}
            >
              <div className="item-rank">
                {getRankIcon(player.rank)}
              </div>
              <div className="item-player">
                <div className="player-avatar">
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.username} />
                  ) : (
                    <span>{(player.username || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="player-info">
                  <div className="player-name">
                    {player.username}
                    {player.isCurrentUser && <span className="you-badge">You</span>}
                  </div>
                  <div className="player-level">Level {player.level}</div>
                </div>
              </div>
              <div className="item-stats">
                <div className="stat">
                  <TrendingUp size={14} />
                  <span>{(player.xp || player.score || 0).toLocaleString()}</span>
                </div>
                <div className="stat">
                  <span>{player.level || 1}</span>
                </div>
                <div className="stat">
                  <span>{player.problemsSolved || 0}</span>
                </div>
                <div className="stat">
                  <Trophy size={14} />
                  <span>{player.wins || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

