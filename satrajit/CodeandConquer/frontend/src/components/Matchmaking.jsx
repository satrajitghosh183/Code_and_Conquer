import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { io } from 'socket.io-client'
import './Matchmaking.css'

export default function Matchmaking({ onClose, onMatchFound }) {
  const [isSearching, setIsSearching] = useState(false)
  const [matchFound, setMatchFound] = useState(false)
  const [opponent, setOpponent] = useState(null)
  const [error, setError] = useState(null)
  const [queuePosition, setQueuePosition] = useState(null)
  const [matchId, setMatchId] = useState(null)
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const socketRef = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
    
    const socket = io(API_URL, {
      auth: { userId: user?.id },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Matchmaking socket connected:', socket.id)
      setError(null)
    })

    socket.on('connect_error', (err) => {
      console.error('Matchmaking connection error:', err)
      setError('Unable to connect to matchmaking server. Please try again.')
      setIsSearching(false)
    })

    socket.on('queue_update', (data) => {
      console.log('Queue update:', data)
      setQueuePosition(data.position || data.queueSize)
    })

    socket.on('match_found', (data) => {
      console.log('Match found:', data)
      setOpponent(data.opponent)
      setMatchId(data.matchId)
      setMatchFound(true)
      setIsSearching(false)
    })

    socket.on('queue_error', (err) => {
      console.error('Queue error:', err)
      setError(err.message || 'Failed to join matchmaking queue')
      setIsSearching(false)
    })

    socket.on('match_cancelled', () => {
      setMatchFound(false)
      setOpponent(null)
      setMatchId(null)
      setIsSearching(false)
      setError('Match was cancelled')
    })

    return () => {
      if (socket.connected) {
        socket.emit('leave_queue', { id: user?.id })
      }
      socket.close()
    }
  }, [user?.id])

  const startMatchmaking = useCallback(async () => {
    if (!socketRef.current?.connected) {
      setError('Not connected to server. Please try again.')
      return
    }

    if (!user?.id) {
      setError('Please log in to use matchmaking.')
      return
    }

    setIsSearching(true)
    setError(null)
    
    // Join matchmaking queue via socket
    socketRef.current.emit('join_queue', {
      id: user.id,
      username: profile?.username || user.email?.split('@')[0] || 'Player',
      level: profile?.level || 1,
      stats: {
        problemsSolved: profile?.problems_solved || 0,
        gamesPlayed: profile?.games_played || 0
      }
    })
  }, [user, profile])

  const cancelMatchmaking = useCallback(() => {
    if (socketRef.current?.connected && user?.id) {
      socketRef.current.emit('leave_queue', { id: user.id })
    }
    setIsSearching(false)
    setQueuePosition(null)
  }, [user?.id])

  const startGame = useCallback(() => {
    if (onMatchFound) {
      onMatchFound({ opponent, matchId })
    }
    navigate('/match', { 
      state: { 
        mode: '1v1', 
        opponent, 
        matchId,
        fromMatchmaking: true 
      } 
    })
  }, [onMatchFound, opponent, matchId, navigate])

  const handleClose = useCallback(() => {
    if (isSearching) {
      cancelMatchmaking()
    }
    onClose()
  }, [isSearching, cancelMatchmaking, onClose])

  return (
    <div className="matchmaking-overlay" onClick={handleClose}>
      <div className="matchmaking-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={handleClose}>✕</button>
        
        {error && (
          <div className="matchmaking-error">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        
        {!isSearching && !matchFound && !error && (
          <div className="matchmaking-start">
            <h2>Find Opponent</h2>
            <p>Match with players of similar skill level in real-time</p>
            <button className="start-search-btn" onClick={startMatchmaking}>
              Start Matchmaking
            </button>
          </div>
        )}

        {isSearching && (
          <div className="matchmaking-search">
            <div className="searching-spinner"></div>
            <h2>Searching for opponent...</h2>
            <p>Looking for a worthy challenger</p>
            {queuePosition && (
              <p className="queue-position">Queue position: {queuePosition}</p>
            )}
            <button className="cancel-search-btn" onClick={cancelMatchmaking}>
              Cancel
            </button>
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
                <div className="player-level">Level {profile?.level || 1}</div>
              </div>
              <div className="vs-divider">VS</div>
              <div className="player-card">
                <div className="player-avatar">
                  {opponent.username?.[0]?.toUpperCase() || 'O'}
                </div>
                <div className="player-name">{opponent.username || 'Opponent'}</div>
                <div className="player-level">Level {opponent.level || 1}</div>
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

