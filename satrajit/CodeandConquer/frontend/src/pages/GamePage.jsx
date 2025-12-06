import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../contexts/GameContext'
import { useAuth } from '../contexts/AuthContext'
import { EnhancedGame } from '../game/EnhancedGame'
import { SoundManager } from '../game/SoundManager'
import BuildBar from '../components/BuildBar'
import LearningModule from '../components/LearningModule'
import CodingConsole from '../components/CodingConsole'
import TaskPanel from '../components/TaskPanel'
import ModelScaleSettings from '../components/ModelScaleSettings'
import TowerPanel from '../components/TowerPanel'
import BasePanel from '../components/BasePanel'
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
  const [energy, setEnergy] = useState(50)
  const [maxEnergy, setMaxEnergy] = useState(100)
  const [health, setHealth] = useState(1000)
  const [maxHealth, setMaxHealth] = useState(1000)
  const [wave, setWave] = useState(0)
  const [waveCountdown, setWaveCountdown] = useState(30)
  const [waveCountdownTotal, setWaveCountdownTotal] = useState(30)
  const [passiveGoldRate, setPassiveGoldRate] = useState(0.5)
  const [passiveEnergyRate, setPassiveEnergyRate] = useState(0.2)
  const [kills, setKills] = useState(0)
  const [level, setLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [selectedStructure, setSelectedStructure] = useState(null)
  const [showLearningModule, setShowLearningModule] = useState(false)
  const [showCodingConsole, setShowCodingConsole] = useState(false)
  const [showTaskPanel, setShowTaskPanel] = useState(false)
  const [showModelScaleSettings, setShowModelScaleSettings] = useState(false)
  const [problemCount, setProblemCount] = useState(0)
  const [availableTowers, setAvailableTowers] = useState(['basic'])
  const [gameState, setGameState] = useState('playing') // playing, paused, gameover
  const [showGameOver, setShowGameOver] = useState(false)
  const [upgradeLevel, setUpgradeLevel] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [vignetteIntensity, setVignetteIntensity] = useState(0)
  const [selectedTower, setSelectedTower] = useState(null)
  const [baseStats, setBaseStats] = useState(null)

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
      onEnergyChange: (newEnergy, max) => {
        setEnergy(newEnergy)
        setMaxEnergy(max)
      },
      onHealthChange: (health, max) => {
        setHealth(health)
        setMaxHealth(max)
      },
      onBaseUpgrade: (stats) => {
        setBaseStats(stats)
      },
      onWaveChange: (waveNum) => {
        setWave(waveNum)
      },
      onWaveCountdown: (countdown, total) => {
        setWaveCountdown(countdown)
        setWaveCountdownTotal(total)
      },
      onTowerSelected: (towerStats) => {
        setSelectedTower(towerStats)
      },
      onProblemReward: (rewards) => {
        console.log('Problem solved! Rewards:', rewards)
        // Could show notification here
      },
      onTaskReward: (rewards) => {
        console.log('Task completed! Rewards:', rewards)
        // Could show notification here
      },
      onPassiveRateChange: (rates) => {
        setPassiveGoldRate(rates.goldPerSecond)
        setPassiveEnergyRate(rates.energyPerSecond)
      },
      initialEnergy: 50,
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
    
    // Get initial base stats
    if (game.getBaseStats) {
      setBaseStats(game.getBaseStats())
    }
    
    // Add keyboard listener for hotkeys
    const handleKeyDown = (e) => {
      // Ignore if typing in console
      if (showCodingConsole) return

      // Pause (P)
      if (e.key === 'p' || e.key === 'P') {
        setIsPaused(prev => !prev)
        if (gameRef.current) {
          gameRef.current.isPaused = !gameRef.current.isPaused
        }
      }

      // Toggle Header (H)
      if (e.key === 'h' || e.key === 'H') {
        setShowHeader(prev => !prev)
      }

      // Mute (M)
      if (e.key === 'm' || e.key === 'M') {
        SoundManager.toggleMute()
      }

      // Start Wave (Space or W)
      if (e.key === ' ' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        if (gameRef.current && gameRef.current.startNextWave) {
          gameRef.current.startNextWave()
        }
      }

      // Open Coding Console (C)
      if (e.key === 'c' || e.key === 'C') {
        setShowCodingConsole(prev => !prev)
      }

      // Cancel Selection (Escape)
      if (e.key === 'Escape') {
        setSelectedStructure(null)
        if (gameRef.current && gameRef.current.cancelPlacement) {
          gameRef.current.cancelPlacement()
        }
      }

      // Tower Selection Hotkeys (1-7)
      const towerHotkeys = {
        '1': 'gattling',
        '2': 'missile',
        '3': 'laser',
        '4': 'sniper',
        '5': 'frost',
        '6': 'fire',
        '7': 'tesla'
      }

      if (towerHotkeys[e.key]) {
        const towerType = towerHotkeys[e.key]
        // Check if tower is available
        if (availableTowers.includes(towerType) || availableTowers.includes('all')) {
          handleStructureSelect(towerType)
        }
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

  // Poll vignette intensity from game visual effects
  useEffect(() => {
    const updateVignette = () => {
      if (gameRef.current && gameRef.current.visualEffects) {
        const intensity = gameRef.current.visualEffects.getDamageVignetteIntensity()
        setVignetteIntensity(intensity)
      }
      requestAnimationFrame(updateVignette)
    }
    const animationId = requestAnimationFrame(updateVignette)
    return () => cancelAnimationFrame(animationId)
  }, [])

  const healthPercent = (health / maxHealth) * 100
  
  const handleStructureSelect = (structureId) => {
    setSelectedStructure(structureId)
    if (gameRef.current) {
      gameRef.current.selectStructureType(structureId)
    }
  }

  const handleTowerUpgrade = useCallback(() => {
    if (!selectedTower || !gameRef.current) return
    const upgraded = gameRef.current.upgradeTower(selectedTower.id)
    if (upgraded) {
      const refreshed = gameRef.current.getTowerStats(selectedTower.id)
      if (refreshed) {
        setSelectedTower(refreshed)
      }
    }
  }, [selectedTower])

  const handleTowerSell = useCallback(() => {
    if (!selectedTower || !gameRef.current) return
    if (gameRef.current.sellTower(selectedTower.id)) {
      setSelectedTower(null)
    }
  }, [selectedTower])
  
  const handleProblemSolved = (problemData) => {
    if (gameRef.current) {
      const rewards = gameRef.current.onProblemSolved(problemData)
      console.log('Problem solved! Rewards:', rewards)
    }
    setShowCodingConsole(false)
  }
  
  const handleTaskCompleted = useCallback((taskData) => {
    if (gameRef.current && gameRef.current.onTaskCompleted) {
      const rewards = gameRef.current.onTaskCompleted(taskData?.type || 'daily')
      console.log('Task completed! Rewards:', rewards)
    }
    setShowTaskPanel(false)
  }, [])
  
  const handleBaseUpgrade = useCallback(() => {
    if (gameRef.current && gameRef.current.upgradeBase) {
      const success = gameRef.current.upgradeBase()
      if (success && gameRef.current.getBaseStats) {
        setBaseStats(gameRef.current.getBaseStats())
      }
    }
  }, [])

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
  const selectedTowerUpgradeCost = selectedTower && gameRef.current
    ? gameRef.current.getTowerUpgradeCost(selectedTower.id)
    : null

  return (
    <div className="game-page">
      {showHeader && (
        <div className="game-header">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Back
          </button>
          <div className="game-title">TOWER DEFENSE</div>
          <div className="game-stats">
            <div className="stat-item gold" title="Coins only from solving coding problems">
              <span className="stat-icon"><Icon name="gold" size={14} color="#ffd700" /></span>
              <span className="stat-value">{gold}</span>
            </div>
            <div className="stat-item energy" title={`Passive: +${passiveEnergyRate.toFixed(2)}/sec`}>
              <span className="stat-icon"><Icon name="bolt" size={14} color="#00ffff" /></span>
              <div className="energy-container">
                <div className="energy-bar">
                  <div className="energy-fill" style={{ width: `${(energy / maxEnergy) * 100}%` }}></div>
                  <span className="energy-text">{energy}/{maxEnergy}</span>
                </div>
                <span className="passive-rate">+{passiveEnergyRate.toFixed(1)}/s</span>
              </div>
            </div>
            <div className="stat-item wave-countdown">
              <span className="stat-icon"><Icon name="wave" size={14} color="#ff4444" /></span>
              <span className="stat-value" style={{ 
                color: waveCountdown < 10 ? '#ff0000' : waveCountdown < 20 ? '#ffaa00' : '#ffffff' 
              }}>
                {Math.ceil(waveCountdown)}s
              </span>
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
            <button 
              className="task-btn"
              onClick={() => setShowTaskPanel(true)}
              title="Complete tasks for energy and time bonuses"
            >
              <Icon name="swords" size={12} color="#ffffff" /> Tasks
            </button>
            <button 
              className="settings-btn"
              onClick={() => setShowModelScaleSettings(true)}
              title="Model Scale Settings"
            >
              <Icon name="settings" size={12} color="#ffffff" /> Scale
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
      
      <TowerPanel 
        tower={selectedTower}
        upgradeCost={selectedTowerUpgradeCost}
        gold={gold}
        onUpgrade={handleTowerUpgrade}
        onSell={handleTowerSell}
      />
      
      <BasePanel
        baseStats={baseStats}
        gold={gold}
        onUpgrade={handleBaseUpgrade}
      />
      
      <div className="game-ui-overlay">
        <div className="game-controls">
          <div className="control-section">
            <h3>Hotkeys</h3>
            <div className="control-item"><kbd>1-7</kbd> Towers</div>
            <div className="control-item"><kbd>Space</kbd> Wave</div>
            <div className="control-item"><kbd>C</kbd> Code</div>
            <div className="control-item"><kbd>P</kbd> Pause</div>
            <div className="control-item"><kbd>H</kbd> Header</div>
            <div className="control-item"><kbd>M</kbd> Mute</div>
            <div className="control-item"><kbd>Esc</kbd> Cancel</div>
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
      
      {showTaskPanel && (
        <TaskPanel
          onClose={() => setShowTaskPanel(false)}
          onTaskComplete={handleTaskCompleted}
        />
      )}
      
      {showModelScaleSettings && (
        <ModelScaleSettings
          onClose={() => setShowModelScaleSettings(false)}
        />
      )}

      {vignetteIntensity > 0 && (
        <div
          className="damage-vignette"
          style={{
            opacity: vignetteIntensity,
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  )
}

