import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../hooks/useSocket'
import CodingConsole from '../components/CodingConsole'
import TaskPanel from '../components/TaskPanel'
import './MatchPage.css'

export default function MatchPage() {
  const { user, profile } = useAuth()
  const { socket, connected } = useSocket()
  const navigate = useNavigate()
  const location = useLocation()
  const [matchState, setMatchState] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [showCodingConsole, setShowCodingConsole] = useState(false)
  const [showTaskPanel, setShowTaskPanel] = useState(false)
  const [currentProblem, setCurrentProblem] = useState(null)
  const gameRef = useRef(null)
  const containerRef = useRef(null)

  const playerId = user?.id
  const displayName = profile?.username || user?.email?.split('@')[0] || 'Player'

  useEffect(() => {
    if (!socket || !connected || !playerId) return

    // Join queue if coming from matchmaking
    if (location.state?.fromMatchmaking) {
      socket.emit('join_queue', {
        id: playerId,
        username: displayName,
        level: 1
      })
    }

    // Listen for match found
    socket.on('match_found', (data) => {
      setMatchState({
        matchId: data.matchId,
        opponent: data.opponent,
        state: 'waiting'
      })
      socket.emit('join_match', data.matchId)
    })

    // Listen for match briefing
    socket.on('match_briefing', (match) => {
      setMatchState(match)
      setGameState(match.gameState)
    })

    // Listen for match started
    socket.on('match_started', async (match) => {
      setMatchState(match)
      setGameState(match.gameState)
      
      // Initialize game
      if (containerRef.current && !gameRef.current) {
        const { Game: GameClass } = await import('../game/Game1v1.js')
        const playerIndex = match.players.findIndex(p => p.id === playerId)
        gameRef.current = new GameClass(containerRef.current, {
          playerId,
          playerIndex,
          matchId: match.id,
          socket,
          gameState: match.gameState,
          onTowerPlace: (position, towerType) => {
            socket.emit('place_tower', {
              matchId: match.id,
              playerId,
              position,
              towerType
            })
          },
          onWaveSpawn: (waveNumber) => {
            socket.emit('spawn_wave', {
              matchId: match.id,
              waveNumber
            })
          }
        })
      }
    })

    // Listen for game state updates
    socket.on('game_state_update', (newGameState) => {
      setGameState(newGameState)
      if (gameRef.current) {
        gameRef.current.updateGameState(newGameState)
      }
    })

    // Listen for coding results
    socket.on('coding_result', (result) => {
      if (result.playerId === playerId) {
        // Show notification
        console.log('Coding result:', result)
        // You could show a toast notification here
        if (result.effects?.energyBoost) {
          // Visual feedback for energy boost
        }
      }
    })

    // Listen for coding errors
    socket.on('coding_error', (error) => {
      console.error('Coding error:', error)
      // Show error notification
    })

    // Listen for match ended
    socket.on('match_ended', (data) => {
      const won = data.winner === playerId
      setMatchState(prev => ({ ...prev, state: 'finished', winner: data.winner }))
      
      // Show end screen
      setTimeout(() => {
        navigate('/dashboard', { state: { matchResult: { won, finalState: data.finalState } } })
      }, 5000)
    })

    return () => {
      socket.off('match_found')
      socket.off('match_briefing')
      socket.off('match_started')
      socket.off('game_state_update')
      socket.off('coding_result')
      socket.off('coding_error')
      socket.off('match_ended')
    }
  }, [socket, connected, playerId, displayName, location.state, navigate])

  const handleStartMatch = () => {
    if (socket && matchState?.id) {
      socket.emit('start_match', matchState.id)
    }
  }

  const handleSubmitCode = (code, problemId, difficulty) => {
    if (socket && matchState?.id) {
      socket.emit('submit_code', {
        matchId: matchState.id,
        playerId,
        code,
        problemId,
        difficulty
      })
      setShowCodingConsole(false)
    }
  }

  if (!matchState) {
    return (
      <div className="match-page">
        <div className="match-loading">
          <h2>Waiting for opponent...</h2>
          <p>Searching for a match</p>
        </div>
      </div>
    )
  }

  if (matchState.state === 'briefing') {
    const playerIndex = matchState.players.findIndex(p => p.id === playerId)
    const playerState = matchState.gameState[`player${playerIndex + 1}`]
    const opponent = matchState.players.find(p => p.id !== playerId)

    return (
      <div className="match-page">
        <div className="match-briefing">
          <h2>Match Found!</h2>
          <div className="opponent-info">
            <div className="player-card">
              <div className="player-name">{displayName}</div>
              <div className="player-buffs">
                {playerState.taskBuffs && (
                  <>
                    <div>+{playerState.taskBuffs.startingEnergyBonus} Starting Energy</div>
                    <div>+{playerState.taskBuffs.baseHpBonusPercent}% Base HP</div>
                    <div>+{playerState.taskBuffs.bonusTowerSlots} Tower Slots</div>
                  </>
                )}
              </div>
            </div>
            <div className="vs">VS</div>
            <div className="player-card">
              <div className="player-name">{opponent?.username || 'Opponent'}</div>
            </div>
          </div>
          <button className="start-btn" onClick={handleStartMatch}>
            Start Match
          </button>
        </div>
      </div>
    )
  }

  if (matchState.state === 'finished') {
    const won = matchState.winner === playerId
    return (
      <div className="match-page">
        <div className="match-ended">
          <h2>{won ? 'Victory!' : 'Defeat'}</h2>
          <p>{won ? 'You won the match!' : 'Better luck next time!'}</p>
          <button onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
        </div>
      </div>
    )
  }

  const playerIndex = matchState.players.findIndex(p => p.id === playerId)
  const playerState = gameState?.[`player${playerIndex + 1}`]

  return (
    <div className="match-page">
      <div className="match-header">
        <div className="match-info">
          <div className="player-stats">
            <div className="stat">
              <span className="stat-label">HP</span>
              <span className="stat-value">{Math.max(0, Math.floor(playerState?.baseHp || 0))}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Energy</span>
              <span className="stat-value">{Math.floor(playerState?.energy || 0)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Wave</span>
              <span className="stat-value">{gameState?.wave || 0}</span>
            </div>
          </div>
        </div>
        <div className="match-actions">
          <button onClick={() => setShowCodingConsole(true)} className="action-btn">
            Coding Challenge
          </button>
          <button onClick={() => setShowTaskPanel(true)} className="action-btn">
            Tasks
          </button>
          <button onClick={() => navigate('/dashboard')} className="action-btn">
            Leave Match
          </button>
        </div>
      </div>

      <div ref={containerRef} className="game-container"></div>

      {showCodingConsole && (
        <CodingConsole
          onClose={() => setShowCodingConsole(false)}
          onSubmit={handleSubmitCode}
          onProblemSelect={setCurrentProblem}
        />
      )}

      {showTaskPanel && (
        <TaskPanel
          onClose={() => setShowTaskPanel(false)}
          onTaskComplete={(taskId) => {
            // Handle task completion during match
            console.log('Task completed:', taskId)
          }}
        />
      )}
    </div>
  )
}

