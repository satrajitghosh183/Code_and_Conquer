import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import CodingConsole from '../components/CodingConsole'
import TaskPanel from '../components/TaskPanel'
import BuildBar from '../components/BuildBar'
import WaveSendPanel from '../components/WaveSendPanel'
import './MatchPage.css'

export default function MatchPage() {
  const { user, profile } = useAuth()
  const { socket, connected, matchData, joinMatch, clearMatchData } = useSocket()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Game state
  const [gameState, setGameState] = useState(null)
  const [showCodingConsole, setShowCodingConsole] = useState(false)
  const [showTaskPanel, setShowTaskPanel] = useState(false)
  const [currentProblem, setCurrentProblem] = useState(null)
  const [gameInitialized, setGameInitialized] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [error, setError] = useState(null)
  const [selectedStructure, setSelectedStructure] = useState(null)
  const [currentPhase, setCurrentPhase] = useState('build') // 'build' or 'combat'
  const [phaseTimeRemaining, setPhaseTimeRemaining] = useState(30)
  const [phaseTotal, setPhaseTotal] = useState(30)
  const [currentRound, setCurrentRound] = useState(1)
  
  const gameRef = useRef(null)
  const containerRef = useRef(null)
  
  const playerId = user?.id
  const displayName = profile?.username || user?.email?.split('@')[0] || 'Player'
  
  // Get match info from location state or matchData context
  const matchId = location.state?.matchId || matchData?.matchId
  const opponent = location.state?.opponent || matchData?.opponent

  // Join match room on mount
  useEffect(() => {
    if (!socket || !connected || !matchId) return
    
    console.log('MatchPage: Joining match room:', matchId)
    joinMatch(matchId)
  }, [socket, connected, matchId, joinMatch])

  // Listen for match events
  useEffect(() => {
    if (!socket) return

    // Match briefing - show countdown
    const handleBriefing = (match) => {
      console.log('MatchPage: Received briefing:', match)
      setGameState(match.gameState)
      
      // Start countdown
      let count = 3
      setCountdown(count)
      
      const countdownInterval = setInterval(() => {
        count--
        setCountdown(count)
        
        if (count <= 0) {
          clearInterval(countdownInterval)
          setCountdown(null)
        }
      }, 1000)
    }

    // Match started - initialize game
    const handleStarted = async (match) => {
      console.log('MatchPage: Match started:', match)
      setGameState(match.gameState)
      
      // Initialize the 3D game
      if (containerRef.current && !gameRef.current) {
        try {
          const { Game1v1 } = await import('../game/Game1v1.js')
          const playerIndex = match.players.findIndex(p => p.id === playerId)
          
          gameRef.current = new Game1v1(containerRef.current, {
            playerId,
            playerIndex,
            matchId: match.id,
            socket,
            gameState: match.gameState,
            callbacks: {
              onStateUpdate: setGameState,
              onGoldChange: (gold) => {
                setGameState(prev => ({
                  ...prev,
                  [`player${playerIndex + 1}`]: {
                    ...prev?.[`player${playerIndex + 1}`],
                    gold
                  }
                }))
              },
              onHealthChange: (health, maxHealth) => {
                setGameState(prev => ({
                  ...prev,
                  [`player${playerIndex + 1}`]: {
                    ...prev?.[`player${playerIndex + 1}`],
                    health,
                    maxHealth
                  }
                }))
              },
              onGameEnd: (won, stats) => {
                console.log('Game ended:', won ? 'Victory!' : 'Defeat')
              }
            }
          })
          
          setGameInitialized(true)
          console.log('MatchPage: Game initialized')
        } catch (err) {
          console.error('MatchPage: Error initializing game:', err)
          setError('Failed to initialize game: ' + err.message)
        }
      }
    }

    // Game state updates
    const handleStateUpdate = (newGameState) => {
      setGameState(newGameState)
      if (gameRef.current?.updateGameState) {
        gameRef.current.updateGameState(newGameState)
      }
    }

    // Match ended
    const handleEnded = (data) => {
      const won = data.winner === playerId
      console.log('MatchPage: Match ended -', won ? 'Victory!' : 'Defeat')
      
      // Show end screen for a moment then navigate
      setTimeout(() => {
        clearMatchData()
        navigate('/dashboard', { 
          state: { 
            matchResult: { won, finalState: data.finalState } 
          } 
        })
      }, 3000)
    }

    // Coding results
    const handleCodingResult = (result) => {
      console.log('Coding result:', result)
      if (result.playerId === playerId) {
        // Visual feedback
      }
    }

    // Phase change handler
    const handlePhaseChange = (data) => {
      console.log('Phase changed:', data)
      setCurrentPhase(data.phase)
      setPhaseTimeRemaining(Math.ceil(data.phaseTimeRemaining / 1000))
      setCurrentRound(data.round || 1)
    }

    // Opponent action handler
    const handleOpponentAction = (data) => {
      console.log('Opponent action:', data)
      
      // Relay to game if available
      if (gameRef.current && gameRef.current.handleOpponentAction) {
        gameRef.current.handleOpponentAction(data)
      }
      
      // Handle wave sent notification
      if (data.type === 'wave_sent') {
        console.log(`⚠️ Incoming wave: ${data.data.quantity}x ${data.data.waveType}!`)
      }
    }

    socket.on('match_briefing', handleBriefing)
    socket.on('match_started', handleStarted)
    socket.on('game_state_update', handleStateUpdate)
    socket.on('match_ended', handleEnded)
    socket.on('coding_result', handleCodingResult)
    socket.on('phase_changed', handlePhaseChange)
    socket.on('opponent_action', handleOpponentAction)
    socket.on('coding_error', (error) => {
      console.error('Coding error:', error)
    })

    return () => {
      socket.off('match_briefing', handleBriefing)
      socket.off('match_started', handleStarted)
      socket.off('game_state_update', handleStateUpdate)
      socket.off('match_ended', handleEnded)
      socket.off('coding_result', handleCodingResult)
      socket.off('phase_changed', handlePhaseChange)
      socket.off('opponent_action', handleOpponentAction)
      socket.off('coding_error')
    }
  }, [socket, playerId, matchId, clearMatchData, navigate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameRef.current?.destroy) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [])

  const handleSubmitCode = (code, problemId, difficulty) => {
    if (socket && matchId) {
      socket.emit('submit_code', {
        matchId,
        playerId,
        code,
        problemId,
        difficulty
      })
      setShowCodingConsole(false)
    }
  }

  const handleLeaveMatch = () => {
    if (gameRef.current?.destroy) {
      gameRef.current.destroy()
    }
    clearMatchData()
    navigate('/dashboard')
  }

  // No match data - redirect or show error
  if (!matchId) {
    return (
      <div className="match-page">
        <div className="match-error">
          <h2>No Match Found</h2>
          <p>You don't appear to be in an active match.</p>
          <button onClick={() => navigate('/play')}>Find a Match</button>
        </div>
      </div>
    )
  }

  // Countdown overlay
  if (countdown !== null) {
    return (
      <div className="match-page">
        <div className="match-countdown">
          <h2>Battle Starting</h2>
          <div className="countdown-number">{countdown === 0 ? 'FIGHT!' : countdown}</div>
          <div className="match-preview">
            <div className="player-preview">
              <span className="player-name">{displayName}</span>
              <span className="vs">VS</span>
              <span className="player-name">{opponent?.username || 'Opponent'}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Waiting for match to start
  if (!gameInitialized && !error) {
    return (
      <div className="match-page">
        <div className="match-loading">
          <div className="loading-spinner"></div>
          <h2>Preparing Battle...</h2>
          <p>Waiting for match to start</p>
          <div className="opponent-preview">
            <span>vs {opponent?.username || 'Opponent'}</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="match-page">
        <div className="match-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
        </div>
      </div>
    )
  }

  // Get player states for UI
  const playerIndex = matchData?.players?.findIndex(p => p.id === playerId) ?? 0
  const playerState = gameState?.[`player${playerIndex + 1}`]
  const opponentIndex = playerIndex === 0 ? 1 : 0
  const opponentState = gameState?.[`player${opponentIndex + 1}`]

  // Handle tower selection from BuildBar
  const handleStructureSelect = useCallback((structureId) => {
    setSelectedStructure(structureId)
    if (gameRef.current && gameRef.current.selectTowerType) {
      gameRef.current.selectTowerType(structureId)
      
      // Emit tower selection to server for sync
      if (socket && connected && matchId) {
        socket.emit('player_action', {
          matchId,
          playerId,
          type: 'tower_selected',
          data: { towerType: structureId }
        })
      }
    }
  }, [socket, connected, matchId, playerId])

  // Handle sending wave to opponent
  const handleSendWave = useCallback((waveType, quantity, cost) => {
    if (!socket || !connected || !matchId) return
    
    // Send wave to server
    socket.emit('send_wave', {
      matchId,
      playerId,
      waveType,
      quantity,
      cost
    })
    
    // Also trigger local game if available
    if (gameRef.current && gameRef.current.sendWave) {
      gameRef.current.sendWave(waveType, quantity)
    }
    
    console.log(`📤 Sending ${quantity}x ${waveType} wave (cost: ${cost}g)`)
  }, [socket, connected, matchId, playerId])

  return (
    <div className="match-page">
      {/* Phase Timer Bar */}
      <div className="phase-timer-bar">
        <div className="phase-info">
          <span className="phase-name">{currentPhase.toUpperCase()} PHASE</span>
          <span className="round-number">Round {currentRound}</span>
        </div>
        <div className="timer-container">
          <div 
            className="timer-fill" 
            style={{ width: `${(phaseTimeRemaining / phaseTotal) * 100}%` }}
          />
          <span className="timer-text">{phaseTimeRemaining}s</span>
        </div>
      </div>

      <div className="match-header">
        <div className="match-info">
          <div className="player-stats">
            <div className="player-name">{displayName}</div>
            <div className="stat hp-stat">
              <span className="stat-label">❤️</span>
              <span className="stat-value">{Math.max(0, Math.floor(playerState?.health || playerState?.baseHp || 1000))}</span>
              <div className="hp-bar">
                <div 
                  className="hp-fill" 
                  style={{ 
                    width: `${Math.min(100, ((playerState?.health || 1000) / (playerState?.maxHealth || 1000)) * 100)}%` 
                  }} 
                />
              </div>
            </div>
            <div className="stat">
              <span className="stat-label">💰</span>
              <span className="stat-value gold">{Math.floor(playerState?.gold || 500)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">⚡</span>
              <span className="stat-value energy">{Math.floor(playerState?.energy || 50)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">📈</span>
              <span className="stat-value income">+{playerState?.income || 20}/turn</span>
            </div>
          </div>
          
          <div className="vs-indicator">⚔️ VS ⚔️</div>
          
          <div className="player-stats opponent">
            <div className="player-name opponent-name">{opponent?.username || 'Opponent'}</div>
            <div className="stat hp-stat">
              <span className="stat-label">❤️</span>
              <span className="stat-value">{Math.max(0, Math.floor(opponentState?.health || opponentState?.baseHp || 1000))}</span>
              <div className="hp-bar opponent-hp">
                <div 
                  className="hp-fill" 
                  style={{ 
                    width: `${Math.min(100, ((opponentState?.health || 1000) / (opponentState?.maxHealth || 1000)) * 100)}%` 
                  }} 
                />
              </div>
            </div>
            <div className="stat">
              <span className="stat-label">💰</span>
              <span className="stat-value gold">{Math.floor(opponentState?.gold || 500)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">📈</span>
              <span className="stat-value income">+{opponentState?.income || 20}/turn</span>
            </div>
          </div>
        </div>
        
        <div className="match-actions">
          <button onClick={() => setShowCodingConsole(true)} className="action-btn code-btn">
            💻 Code Challenge
          </button>
          <button onClick={() => setShowTaskPanel(true)} className="action-btn task-btn">
            ✅ Tasks
          </button>
          <button onClick={handleLeaveMatch} className="action-btn leave-btn">
            ❌ Leave
          </button>
        </div>
      </div>

      <div ref={containerRef} className="game-container"></div>

      {/* BuildBar for tower placement */}
      <BuildBar 
        gold={playerState?.gold || 500}
        selectedStructure={selectedStructure}
        onSelect={handleStructureSelect}
        availableStructures={[]}
      />
      
      {/* WaveSendPanel for attacking opponent */}
      <WaveSendPanel 
        gold={playerState?.gold || 500}
        income={playerState?.income || 20}
        onSendWave={handleSendWave}
        disabled={false}
        phase={currentPhase}
      />

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
          onTaskComplete={async (taskId) => {
            try {
              const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
              const response = await fetch(`${API_URL}/tasks/${taskId}`)
              if (response.ok) {
                const task = await response.json()
                const taskType = task.dueDate ? 'weekly' : 'daily'
                
                if (socket && connected && matchId) {
                  socket.emit('task_completed', {
                    matchId,
                    playerId,
                    taskType
                  })
                }
              }
            } catch (error) {
              console.error('Error handling task completion:', error)
            }
          }}
        />
      )}
    </div>
  )
}
