import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../contexts/GameContext'
import { useAuth } from '../contexts/AuthContext'
import { EnhancedGame } from '../game/EnhancedGame'
import BuildBar from '../components/BuildBar'
import LearningModule from '../components/LearningModule'
import CodingConsole from '../components/CodingConsole'
import { Icon } from '../components/Icons'
import './GamePage.css'

export default function GamePage() {
  const containerRef = useRef(null)
  const gameRef = useRef(null)
  const navigate = useNavigate()
  const { stats, spendCoins, addGameResult } = useGame()
  const { user, profile } = useAuth()
  const [gameStarted, setGameStarted] = useState(false)
  const [gold, setGold] = useState(500)
  const [health, setHealth] = useState(1000)
  const [maxHealth, setMaxHealth] = useState(1000)
  const [wave, setWave] = useState(0)
  const [kills, setKills] = useState(0)
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [selectedStructure, setSelectedStructure] = useState(null)
  const [showLearningModule, setShowLearningModule] = useState(false)
  const [showCodingConsole, setShowCodingConsole] = useState(false)
  const [problemCount, setProblemCount] = useState(0)
  const [availableTowers, setAvailableTowers] = useState(['basic'])
  const [gameState, setGameState] = useState('playing') // playing, paused, gameover
  const [showGameOver, setShowGameOver] = useState(false)
  const [upgradeLevel, setUpgradeLevel] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [showHeader, setShowHeader] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    // Get user profile data for task buffs
    const userProfile = {
      tasks: {
        dailyCompleted: 0, // TODO: Get from actual task data
        weeklyCompleted: 0,
        currentStreak: 0,
        allTimeCompleted: 0
      },
      totalProblemsSolved: stats.problemsSolved || 0
    }
    
    // Initialize game
    const game = new EnhancedGame(containerRef.current, {
      onGameEnd: (won) => {
        setGameState(won ? 'victory' : 'gameover')
        setShowGameOver(true)
        if (won) {
          addGameResult(true)
        } else {
          addGameResult(false)
        }
      },
      onGoldChange: (newGold) => {
        setGold(newGold)
      },
      onHealthChange: (health, max) => {
        setHealth(health)
        setMaxHealth(max)
      },
      onWaveChange: (waveNum) => {
        setWave(waveNum)
      },
      onEnemyKilled: (enemyType, goldReward, xpReward) => {
        setKills(prev => prev + 1)
        setScore(prev => prev + xpReward)
      },
      onLevelUp: (newLevel) => {
        setLevel(newLevel)
      },
      onModelsReady: () => {
        setGameStarted(true)
      },
      onShowLearningModule: (count) => {
        setProblemCount(count)
        setShowLearningModule(true)
      },
      onShowFloatingText: (text, position, options) => {
        // Could implement floating text here
        console.log('Floating text:', text)
      },
      onAbilityCharge: (amount) => {
        // Handle ability charge
        console.log('Ability charge:', amount)
      },
      onXPChange: (xp) => {
        setScore(xp)
      },
      initialGold: stats.coins || 500
    }, userProfile)
    
    // Store available towers from game
    if (game.availableTowers) {
      setAvailableTowers(game.availableTowers)
    }

    gameRef.current = game
    
    // Add keyboard listener for pause and header toggle
    const handleKeyDown = (e) => {
      if (e.key === 'p' || e.key === 'P') {
        setIsPaused(prev => !prev)
        if (gameRef.current) {
          gameRef.current.isPaused = !gameRef.current.isPaused
        }
      }
      if (e.key === 'h' || e.key === 'H') {
        setShowHeader(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (gameRef.current) {
        if (gameRef.current.destroy) {
          gameRef.current.destroy()
        }
        if (gameRef.current.performanceManager) {
          gameRef.current.performanceManager.stopMonitoring()
        }
      }
    }
  }, [])

  const healthPercent = (health / maxHealth) * 100
  
  const handleStructureSelect = (structureId) => {
    setSelectedStructure(structureId)
    if (gameRef.current) {
      gameRef.current.selectStructureType(structureId)
    }
  }
  
  const handleProblemSolved = (problemData) => {
    if (gameRef.current) {
      const rewards = gameRef.current.onProblemSolved(problemData)
      console.log('Problem solved! Rewards:', rewards)
    }
    setShowCodingConsole(false)
  }

  const handleUpgrade = useCallback(() => {
    const upgradeCost = 500 * Math.pow(2, upgradeLevel - 1)
    if (gold >= upgradeCost && gameRef.current) {
      setGold(prev => prev - upgradeCost)
      setUpgradeLevel(prev => prev + 1)
      // Apply upgrade to game
      if (gameRef.current.passiveBuffs) {
        gameRef.current.passiveBuffs.goldRateMultiplier = (gameRef.current.passiveBuffs.goldRateMultiplier || 1) * 1.1
      }
    }
  }, [gold, upgradeLevel])

  const handleRestart = useCallback(() => {
    setShowGameOver(false)
    setGameState('playing')
    setKills(0)
    setScore(0)
    setWave(0)
    setLevel(1)
    setHealth(1000)
    setGold(500)
    
    // Reinitialize game
    if (gameRef.current && gameRef.current.destroy) {
      gameRef.current.destroy()
    }
    // Page will need to be refreshed - navigate and come back
    navigate('/play')
  }, [navigate])

  const upgradeCost = 500 * Math.pow(2, upgradeLevel - 1)

  return (
    <div className="game-page">
      {showHeader && (
        <div className="game-header">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Back
          </button>
          <div className="game-title">TOWER DEFENSE</div>
          <div className="game-stats">
            <div className="stat-item gold">
              <span className="stat-icon"><Icon name="gold" size={14} color="#ffd700" /></span>
              <span className="stat-value">{gold}</span>
            </div>
            <div className="stat-item health">
              <span className="stat-icon"><Icon name="heart" size={14} color="#ff0000" /></span>
              <div className="health-bar">
                <div className="health-fill" style={{ width: `${healthPercent}%` }}></div>
                <span className="health-text">{health}</span>
              </div>
            </div>
            <div className="stat-item wave">
              <span className="stat-icon"><Icon name="wave" size={14} color="#ff4444" /></span>
              <span className="stat-value">{wave}</span>
            </div>
            <div className="stat-item kills">
              <span className="stat-icon"><Icon name="target" size={14} color="#ff6600" /></span>
              <span className="stat-value">{kills}</span>
            </div>
          </div>
          <div className="header-buttons">
            <button 
              className="coding-challenge-btn"
              onClick={() => setShowCodingConsole(true)}
            >
              <Icon name="code" size={12} color="#ffffff" /> Code
            </button>
          </div>
        </div>
      )}
      
      {!showHeader && (
        <button 
          className="header-toggle-btn"
          onClick={() => setShowHeader(true)}
          title="Press H to show header"
        >
          <Icon name="arrow_down" size={16} color="#ff0000" />
        </button>
      )}
      <div ref={containerRef} className="game-container" id="game-container"></div>
      
      <BuildBar 
        gold={gold}
        selectedStructure={selectedStructure}
        onSelect={handleStructureSelect}
        availableStructures={availableTowers}
      />
      
      <div className="game-ui-overlay">
        <div className="game-controls">
          <div className="control-section">
            <h3>Keys</h3>
            <div className="control-item"><kbd>B</kbd> Build</div>
            <div className="control-item"><kbd>H</kbd> Header</div>
            <div className="control-item"><kbd>Space</kbd> Wave</div>
            <div className="control-item"><kbd>P</kbd> Pause</div>
          </div>
        </div>
      </div>
      
      {isPaused && (
        <div className="pause-overlay">
          <div className="pause-text">PAUSED</div>
          <div className="pause-hint">Press P to resume</div>
        </div>
      )}
      
      {showGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>{gameState === 'victory' ? 'VICTORY!' : 'GAME OVER'}</h2>
            <div className="game-over-stats">
              <div className="go-stat">
                <span className="go-label">Score</span>
                <span className="go-value">{score}</span>
              </div>
              <div className="go-stat">
                <span className="go-label">Kills</span>
                <span className="go-value">{kills}</span>
              </div>
              <div className="go-stat">
                <span className="go-label">Waves</span>
                <span className="go-value">{wave}</span>
              </div>
              <div className="go-stat">
                <span className="go-label">Level</span>
                <span className="go-value">{level}</span>
              </div>
            </div>
            <div className="game-over-buttons">
              <button onClick={handleRestart} className="restart-btn">
                <Icon name="play" size={18} color="#ffffff" /> Play Again
              </button>
              <button onClick={() => navigate('/dashboard')} className="menu-btn">
                <Icon name="arrow_right" size={18} color="#ffffff" /> Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showLearningModule && (
        <LearningModule 
          onClose={() => setShowLearningModule(false)}
          problemCount={problemCount}
        />
      )}
      
      {showCodingConsole && (
        <CodingConsole
          onClose={() => setShowCodingConsole(false)}
          onSubmit={handleProblemSolved}
        />
      )}
    </div>
  )
}

