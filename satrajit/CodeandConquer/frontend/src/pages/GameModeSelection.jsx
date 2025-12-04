import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useGame } from '../contexts/GameContext'
import HeroSelection from '../components/HeroSelection'
import TechTree from '../components/TechTree'
import Matchmaking from '../components/Matchmaking'
import { Icon } from '../components/Icons'
import './GameModeSelection.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function GameModeSelection() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { stats } = useGame()
  const [showHeroSelection, setShowHeroSelection] = useState(false)
  const [showTechTree, setShowTechTree] = useState(false)
  const [showMatchmaking, setShowMatchmaking] = useState(false)
  const [loadout, setLoadout] = useState(null)
  const [selectedHero, setSelectedHero] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadPlayerLoadout()
    }
  }, [user])

  const loadPlayerLoadout = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/progression/loadout/${user.id}`)
      const data = await response.json()
      setLoadout(data)
      setSelectedHero(data.hero)
    } catch (error) {
      console.error('Error loading loadout:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartSinglePlayer = () => {
    navigate('/game', { state: { mode: 'single-player', hero: selectedHero } })
  }

  const handleStartMultiplayer = () => {
    setShowMatchmaking(true)
  }

  if (loading) {
    return (
      <div className="game-mode-page">
        <div className="loading-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-mode-page">
      <div className="game-mode-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back to Dashboard
        </button>
        <div className="player-stats">
          <div className="stat-badge">
            <span>Level {loadout?.level || 1}</span>
          </div>
          <div className="stat-badge">
            <span>{loadout?.rank || 'Bronze'} {loadout?.rankLevel || 1}</span>
          </div>
        </div>
      </div>

      <div className="game-mode-container">
        <div className="game-mode-title">
          <h1>Choose Your Battle</h1>
          <p>Select a game mode and prepare for combat</p>
        </div>

        {/* Hero Display */}
        {selectedHero && (
          <div className="selected-hero-display">
            <div className="hero-card-compact">
              <div className="hero-icon-large">{getHeroIcon(selectedHero.id)}</div>
              <div className="hero-info">
                <h3>{selectedHero.name}</h3>
                <div className="hero-language">{selectedHero.language}</div>
                <div className="hero-stats-compact">
                  <span><Icon name="heart" size={14} color="#ff0000" /> {selectedHero.stats.baseHealth}</span>
                  <span><Icon name="swords" size={14} color="#ff4444" /> {selectedHero.stats.baseDamage}</span>
                  <span><Icon name="bolt" size={14} color="#ffd700" /> {selectedHero.stats.baseSpeed.toFixed(1)}</span>
                </div>
              </div>
              <button 
                className="change-hero-btn"
                onClick={() => setShowHeroSelection(true)}
              >
                Change Hero
              </button>
            </div>
          </div>
        )}

        {/* Loadout Summary */}
        {loadout && (
          <div className="loadout-summary">
            <h3>Your Loadout</h3>
            <div className="loadout-grid">
              <div className="loadout-item">
                <span className="loadout-icon"><Icon name="gold" size={24} color="#ffd700" /></span>
                <div className="loadout-details">
                  <div className="loadout-label">Starting Gold</div>
                  <div className="loadout-value">{loadout.bonuses.startingGold}</div>
                </div>
              </div>
              <div className="loadout-item">
                <span className="loadout-icon"><Icon name="barracks" size={24} color="#ff0000" /></span>
                <div className="loadout-details">
                  <div className="loadout-label">Base HP</div>
                  <div className="loadout-value">{(loadout.bonuses.baseHpMultiplier * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="loadout-item">
                <span className="loadout-icon"><Icon name="troops" size={24} color="#ff4444" /></span>
                <div className="loadout-details">
                  <div className="loadout-label">Available Units</div>
                  <div className="loadout-value">{loadout.availableUnits.length}</div>
                </div>
              </div>
              <div className="loadout-item">
                <span className="loadout-icon"><Icon name="tower" size={24} color="#ff0000" /></span>
                <div className="loadout-details">
                  <div className="loadout-label">Available Towers</div>
                  <div className="loadout-value">{loadout.availableTowers.length}</div>
                </div>
              </div>
            </div>
            <button 
              className="tech-tree-btn"
              onClick={() => setShowTechTree(true)}
            >
              Open Tech Tree
            </button>
          </div>
        )}

        {/* Game Modes */}
        <div className="game-modes-grid">
          <div className="game-mode-card single-player">
            <div className="mode-icon"><Icon name="play" size={48} color="#ff0000" /></div>
            <h2>Single Player</h2>
            <p>Practice against AI and improve your skills</p>
            <ul className="mode-features">
              <li><Icon name="check" size={14} color="#10b981" /> Unlimited waves</li>
              <li><Icon name="check" size={14} color="#10b981" /> Earn XP and gold</li>
              <li><Icon name="check" size={14} color="#10b981" /> Test your hero abilities</li>
              <li><Icon name="check" size={14} color="#10b981" /> Perfect your strategies</li>
            </ul>
            <button 
              className="mode-btn primary"
              onClick={handleStartSinglePlayer}
            >
              Start Single Player
            </button>
          </div>

          <div className="game-mode-card multiplayer">
            <div className="mode-icon"><Icon name="swords" size={48} color="#ff0000" /></div>
            <h2>Multiplayer 1v1</h2>
            <p>Compete against real players in real-time battles</p>
            <ul className="mode-features">
              <li><Icon name="check" size={14} color="#10b981" /> Ranked matchmaking</li>
              <li><Icon name="check" size={14} color="#10b981" /> Solve problems for advantages</li>
              <li><Icon name="check" size={14} color="#10b981" /> Hero abilities and power-ups</li>
              <li><Icon name="check" size={14} color="#10b981" /> Climb the leaderboard</li>
            </ul>
            <button 
              className="mode-btn primary"
              onClick={handleStartMultiplayer}
            >
              Find Match
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="quick-stat">
            <div className="quick-stat-label">Problems Solved</div>
            <div className="quick-stat-value">{stats.problemsSolved || 0}</div>
          </div>
          <div className="quick-stat">
            <div className="quick-stat-label">Games Played</div>
            <div className="quick-stat-value">{stats.gamesPlayed || 0}</div>
          </div>
          <div className="quick-stat">
            <div className="quick-stat-label">Win Rate</div>
            <div className="quick-stat-value">
              {stats.gamesPlayed > 0 
                ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) 
                : 0}%
            </div>
          </div>
        </div>
      </div>

      {showHeroSelection && (
        <HeroSelection 
          onClose={() => {
            setShowHeroSelection(false)
            loadPlayerLoadout()
          }}
          onSelect={(hero) => {
            setSelectedHero(hero)
            setShowHeroSelection(false)
            loadPlayerLoadout()
          }}
        />
      )}

      {showTechTree && (
        <TechTree 
          onClose={() => {
            setShowTechTree(false)
            loadPlayerLoadout()
          }}
        />
      )}

      {showMatchmaking && (
        <Matchmaking 
          onClose={() => setShowMatchmaking(false)}
          onMatchFound={(opponent) => {
            setShowMatchmaking(false)
            navigate('/match', { 
              state: { 
                mode: '1v1', 
                opponent, 
                hero: selectedHero,
                fromMatchmaking: true 
              } 
            })
          }}
        />
      )}
    </div>
  )
}

function getHeroIcon(heroId) {
  const iconMap = {
    python: 'python',
    cpp: 'cpp',
    java: 'java',
    javascript: 'javascript',
    rust: 'bolt',
    go: 'go'
  }
  const iconName = iconMap[heroId] || 'user'
  return <Icon name={iconName} size={48} color="#ff0000" />
}

