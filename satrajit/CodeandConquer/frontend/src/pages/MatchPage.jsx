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
  const [errorDetails, setErrorDetails] = useState(null)
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

  // Game initialization function (reusable)
  const initializeGame = useCallback(async (match) => {
    if (!match) {
      console.error('MatchPage: Cannot initialize - match is null')
      return false
    }
    
    if (!containerRef.current) {
      console.error('MatchPage: Cannot initialize - container not ready')
      return false
    }
    
    if (gameRef.current) {
      console.warn('MatchPage: Game already initialized')
      return true
    }
    
    try {
      const { Game1v1 } = await import('../game/Game1v1.js')
      
      // Find player index with multiple fallbacks
      let playerIndex = -1
      if (match.players && Array.isArray(match.players)) {
        // Try exact match first
        playerIndex = match.players.findIndex(p => p.id === playerId)
        
        // Fallback: try userId or playerId fields
        if (playerIndex === -1) {
          playerIndex = match.players.findIndex(p => 
            p.userId === playerId || 
            p.playerId === playerId ||
            p.id === playerId
          )
        }
        
        // Last resort: use first player if we're player1, second if we're player2
        if (playerIndex === -1 && match.players.length >= 2) {
          // Check if we're in the match by comparing with known player IDs
          const player1Id = match.players[0]?.id || match.players[0]?.userId || match.players[0]?.playerId
          const player2Id = match.players[1]?.id || match.players[1]?.userId || match.players[1]?.playerId
          
          if (player1Id === playerId) {
            playerIndex = 0
          } else if (player2Id === playerId) {
            playerIndex = 1
          }
        }
      }
      
      // Validate playerIndex
      if (playerIndex === -1) {
        console.error('MatchPage: Could not determine player index', {
          playerId,
          players: match.players,
          matchId: match.id || match.matchId
        })
        // Default to 0 as fallback
        playerIndex = 0
        console.warn('MatchPage: Using default playerIndex 0')
      }
      
      console.log('MatchPage: Initializing game with:', {
        playerId,
        playerIndex,
        matchId: match.id || match.matchId,
        playersCount: match.players?.length || 0
      })
      
      gameRef.current = new Game1v1(containerRef.current, {
        playerId,
        playerIndex,
        matchId: match.id || match.matchId || matchId,
        socket,
        gameState: match.gameState || {},
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
      console.log('MatchPage: Game initialized successfully')
      return true
    } catch (err) {
      console.error('MatchPage: Error initializing game:', err)
      const errorMessage = 'Failed to initialize game: ' + (err.message || err.toString())
      setError(errorMessage)
      setErrorDetails({
        message: err.message,
        stack: err.stack,
        name: err.name,
        fullError: err.toString()
      })
      return false
    }
  }, [playerId, matchId, socket])

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
      console.log('MatchPage: Match started event received:', match)
      console.log('MatchPage: Match data:', {
        id: match?.id,
        matchId: match?.matchId,
        players: match?.players,
        playersLength: match?.players?.length,
        gameState: match?.gameState
      })
      
      // Validate match data
      if (!match) {
        console.error('MatchPage: Match data is null or undefined')
        setError('Invalid match data received')
        setErrorDetails({ message: 'Match data is null or undefined', match })
        return
      }
      
      if (!match.id && !match.matchId) {
        console.error('MatchPage: Match missing id and matchId')
        setError('Match missing ID field')
        setErrorDetails({ message: 'Match missing ID field', match })
        return
      }
      
      if (!match.players || !Array.isArray(match.players) || match.players.length === 0) {
        console.error('MatchPage: Match missing or invalid players array:', match.players)
        setError('Match missing players data')
        setErrorDetails({ message: 'Match missing players data', players: match.players, match })
        return
      }
      
      setGameState(match.gameState || {})
      
      // Initialize the game using the reusable function
      await initializeGame(match)
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
      setError('Coding error: ' + (error?.message || error))
      setErrorDetails({ type: 'coding_error', error })
    })

    socket.on('match_error', (errorData) => {
      console.error('Match error:', errorData)
      setError(errorData?.error || errorData?.message || 'Match error occurred')
      setErrorDetails({ type: 'match_error', ...errorData })
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
      setError('Connection error: ' + (error?.message || error))
      setErrorDetails({ type: 'socket_error', error })
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setError('Failed to connect to server: ' + (error?.message || error))
      setErrorDetails({ type: 'connect_error', error })
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
      socket.off('match_error')
      socket.off('error')
      socket.off('connect_error')
    }
  }, [socket, playerId, matchId, clearMatchData, navigate, initializeGame])

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

  // Timeout mechanism - request match state if stuck
  useEffect(() => {
    if (!gameInitialized && !error && socket && connected && matchId) {
      // After 10 seconds, request match state
      const timeout = setTimeout(() => {
        console.log('MatchPage: Timeout - requesting match state')
        if (socket && connected) {
          socket.emit('get_match_state', matchId)
        }
      }, 10000)
      
      // After 20 seconds, show error
      const errorTimeout = setTimeout(() => {
        if (!gameInitialized) {
          console.error('MatchPage: Match start timeout - no match_started event received')
          setError('Match failed to start. Please try again.')
          setErrorDetails({
            message: 'Match start timeout',
            timeout: '20 seconds',
            matchId,
            playerId,
            socketConnected: connected
          })
        }
      }, 20000)
      
      return () => {
        clearTimeout(timeout)
        clearTimeout(errorTimeout)
      }
    }
  }, [gameInitialized, error, socket, connected, matchId])

  // Listen for match_state response (for recovery/timeout scenarios)
  useEffect(() => {
    if (!socket) return
    
    const handleMatchState = async (match) => {
      console.log('MatchPage: Received match state:', match)
      // If match is already running but game not initialized, initialize it
      if (match && (match.state === 'running' || match.status === 'running') && !gameInitialized) {
        console.log('MatchPage: Match is already running, initializing game from state')
        setGameState(match.gameState || {})
        await initializeGame(match)
      } else if (match && match.state === 'briefing' && !countdown) {
        // If match is in briefing but we missed the briefing event, show countdown
        console.log('MatchPage: Match in briefing, showing countdown')
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
    }
    
    socket.on('match_state', handleMatchState)
    
    return () => {
      socket.off('match_state', handleMatchState)
    }
  }, [socket, gameInitialized, initializeGame, countdown])

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
          {countdown !== null && (
            <div className="countdown-display">
              <span className="countdown-number">{countdown}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    const copyErrorDetails = () => {
      const errorText = JSON.stringify({
        error,
        errorDetails,
        matchId,
        playerId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }, null, 2)
      
      navigator.clipboard.writeText(errorText).then(() => {
        alert('Error details copied to clipboard!')
      }).catch(() => {
        // Fallback: show in alert
        prompt('Copy this error information:', errorText)
      })
    }

    const openConsole = () => {
      alert('To view console errors:\n\n1. Press F12 or Right-click → Inspect\n2. Go to the "Console" tab\n3. Look for red error messages\n\nOr check Vercel logs:\n1. Go to vercel.com\n2. Select your project\n3. Go to "Deployments"\n4. Click on the latest deployment\n5. Click "Functions" or "Logs" tab')
    }

    return (
      <div className="match-page">
        <div className="match-error" style={{
          padding: '40px',
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: '#1a1a2e',
          borderRadius: '16px',
          border: '1px solid #ff4757',
          color: '#ffffff'
        }}>
          <h2 style={{ color: '#ff4757', marginBottom: '16px' }}>⚠️ Error</h2>
          <p style={{ fontSize: '18px', marginBottom: '24px', color: '#ffffff' }}>{error}</p>
          
          {errorDetails && (
            <details style={{
              marginBottom: '24px',
              backgroundColor: '#12121f',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #2a2a4a'
            }}>
              <summary style={{
                cursor: 'pointer',
                color: '#ff9f43',
                fontWeight: '500',
                marginBottom: '12px',
                userSelect: 'none'
              }}>
                Error Details (Click to expand)
              </summary>
              <pre style={{
                color: '#ff6b6b',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '300px',
                whiteSpace: 'pre-wrap',
                margin: 0,
                padding: '12px',
                backgroundColor: '#0f0f1a',
                borderRadius: '4px'
              }}>
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            </details>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '16px'
          }}>
            <button 
              onClick={copyErrorDetails}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ff9f43',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📋 Copy Error Details
            </button>
            <button 
              onClick={openConsole}
              style={{
                padding: '10px 20px',
                backgroundColor: '#5352ed',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              🔍 How to View Logs
            </button>
          </div>

          <div style={{
            backgroundColor: '#12121f',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#8892b0'
          }}>
            <strong style={{ color: '#ff9f43' }}>To see errors in production:</strong>
            <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>Open browser console (F12 → Console tab)</li>
              <li>Check Vercel Dashboard → Deployments → Latest → Functions/Logs</li>
              <li>Use the "Copy Error Details" button above</li>
            </ol>
          </div>

          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ff4757',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              width: '100%'
            }}
          >
            Return to Dashboard
          </button>
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
