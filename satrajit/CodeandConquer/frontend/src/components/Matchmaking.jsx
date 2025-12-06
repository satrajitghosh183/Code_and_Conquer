import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import './Matchmaking.css'

export default function Matchmaking({ onClose, onMatchFound }) {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState(null)
  const [queuePosition, setQueuePosition] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const { user, profile } = useAuth()
  const { 
    socket, 
    connected, 
    matchData, 
    joinQueue, 
    leaveQueue, 
    joinMatch, 
    startMatch,
    clearMatchData 
  } = useSocket()
  const navigate = useNavigate()

  // Listen for queue updates
  useEffect(() => {
    if (!socket) return

    const handleQueueUpdate = (data) => {
      console.log('Queue update:', data)
      setQueuePosition(data.position || data.queueSize)
    }

    const handleQueueError = (err) => {
      console.error('Queue error:', err)
      setError(err.message || 'Failed to join matchmaking queue')
      setIsSearching(false)
    }

    socket.on('queue_update', handleQueueUpdate)
    socket.on('queue_error', handleQueueError)

    return () => {
      socket.off('queue_update', handleQueueUpdate)
      socket.off('queue_error', handleQueueError)
    }
  }, [socket])

  // Handle match found - stop searching
  useEffect(() => {
    if (matchData?.status === 'found') {
      setIsSearching(false)
    }
  }, [matchData])

  const startMatchmaking = useCallback(async () => {
    if (!connected) {
      setError('Not connected to server. Please try again.')
      return
    }

    if (!user?.id) {
      setError('Please log in to use matchmaking.')
      return
    }

    setIsSearching(true)
    setError(null)
    
    // Join matchmaking queue via shared socket
    const success = joinQueue({
      username: profile?.username || user.email?.split('@')[0] || 'Player',
      level: profile?.level || 1,
      stats: {
        problemsSolved: profile?.problems_solved || 0,
        gamesPlayed: profile?.games_played || 0
      }
    })
    
    if (!success) {
      setError('Failed to join queue. Please try again.')
      setIsSearching(false)
    }
  }, [connected, user, profile, joinQueue])

  const cancelMatchmaking = useCallback(() => {
    leaveQueue()
    setIsSearching(false)
    setQueuePosition(null)
  }, [leaveQueue])

  // Start the battle - join room and trigger countdown
  const handleStartBattle = useCallback(() => {
    if (!matchData?.matchId) {
      setError('Match not ready')
      return
    }
    
    // Join the match room first
    joinMatch(matchData.matchId)
    
    // Start the countdown
    setCountdown(3)
  }, [matchData, joinMatch])

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return
    
    if (countdown === 0) {
      // Countdown finished - emit start_match and navigate
      if (matchData?.matchId) {
        startMatch(matchData.matchId)
      }
      
      // Notify parent
      if (onMatchFound) {
        onMatchFound({ opponent: matchData?.opponent, matchId: matchData?.matchId })
      }
      
      // Navigate to match page
      navigate('/match', { 
        state: { 
          mode: '1v1', 
          opponent: matchData?.opponent, 
          matchId: matchData?.matchId,
          fromMatchmaking: true 
        } 
      })
      return
    }
    
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [countdown, matchData, startMatch, onMatchFound, navigate])

  const handleClose = useCallback(() => {
    if (isSearching) {
      cancelMatchmaking()
    }
    if (countdown === null && !matchData) {
      // Only clear match data if not in countdown
      clearMatchData()
    }
    onClose()
  }, [isSearching, countdown, matchData, cancelMatchmaking, clearMatchData, onClose])

  // Countdown overlay
  if (countdown !== null) {
    return (
      <div className="matchmaking-overlay">
        <div className="matchmaking-modal countdown-modal">
          <div className="countdown-display">
            <h2>Battle Starting</h2>
            <div className="countdown-number">{countdown === 0 ? 'GO!' : countdown}</div>
            <p>Get ready to defend!</p>
          </div>
        </div>
      </div>
    )
  }

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
        
        {!connected && !error && (
          <div className="matchmaking-connecting">
            <div className="connecting-spinner"></div>
            <h2>Connecting...</h2>
            <p>Establishing connection to matchmaking server</p>
          </div>
        )}
        
        {connected && !isSearching && !matchData && !error && (
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

        {matchData?.status === 'found' && matchData.opponent && (
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
                  {matchData.opponent.username?.[0]?.toUpperCase() || 'O'}
                </div>
                <div className="player-name">{matchData.opponent.username || 'Opponent'}</div>
                <div className="player-level">Level {matchData.opponent.level || 1}</div>
              </div>
            </div>
            <button className="start-game-btn" onClick={handleStartBattle}>
              Start Battle
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
