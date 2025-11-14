import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Matchmaking.css'

export default function Matchmaking({ onClose, onMatchFound }) {
  const [isSearching, setIsSearching] = useState(false)
  const [matchFound, setMatchFound] = useState(false)
  const [opponent, setOpponent] = useState(null)
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const startMatchmaking = async () => {
    setIsSearching(true)
    
    // In real implementation, this would use Socket.IO
    // For now, simulate matchmaking
    setTimeout(() => {
      setOpponent({
        username: 'Player' + Math.floor(Math.random() * 1000),
        level: Math.floor(Math.random() * 20) + 1,
        avatar: null
      })
      setMatchFound(true)
      setIsSearching(false)
    }, 2000)
  }

  const startGame = () => {
    if (onMatchFound) {
      onMatchFound(opponent)
    }
    navigate('/match', { state: { mode: '1v1', opponent, fromMatchmaking: true } })
  }

  return (
    <div className="matchmaking-overlay" onClick={onClose}>
      <div className="matchmaking-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>X</button>
        
        {!isSearching && !matchFound && (
          <div className="matchmaking-start">
            <h2>Find Opponent</h2>
            <p>Match with players of similar skill level</p>
            <button className="start-search-btn" onClick={startMatchmaking}>
              Start Matchmaking
            </button>
          </div>
        )}

        {isSearching && (
          <div className="matchmaking-search">
            <div className="searching-spinner"></div>
            <h2>Searching for opponent...</h2>
            <p>Finding the perfect match</p>
          </div>
        )}

        {matchFound && opponent && (
          <div className="matchmaking-found">
            <h2>Match Found!</h2>
            <div className="opponent-info">
              <div className="player-card">
                <div className="player-avatar">
                  {(profile?.username || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div className="player-name">{profile?.username || user?.email?.split('@')[0] || 'You'}</div>
                <div className="player-level">Level {Math.floor(Math.random() * 20) + 1}</div>
              </div>
              <div className="vs-divider">VS</div>
              <div className="player-card">
                <div className="player-avatar">
                  {opponent.username[0].toUpperCase()}
                </div>
                <div className="player-name">{opponent.username}</div>
                <div className="player-level">Level {opponent.level}</div>
              </div>
            </div>
            <button className="start-game-btn" onClick={startGame}>
              Start Battle
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

