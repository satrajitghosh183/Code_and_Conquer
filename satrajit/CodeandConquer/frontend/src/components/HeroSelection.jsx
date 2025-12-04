import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Icon } from './Icons'
import './HeroSelection.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const HERO_COLORS = {
  python: '#3776ab',
  cpp: '#00599c',
  java: '#007396',
  javascript: '#f7df1e',
  rust: '#ce422b',
  go: '#00add8'
}

const RARITY_COLORS = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b'
}

export default function HeroSelection({ onClose, onSelect }) {
  const { user } = useAuth()
  const [heroes, setHeroes] = useState([])
  const [selectedHero, setSelectedHero] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      loadHeroes()
    }
  }, [user])

  const loadHeroes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/progression/heroes/${user.id}`)
      const data = await response.json()
      setHeroes(data)
      
      // Set initially selected hero
      const currentlySelected = data.find(h => h.selected)
      if (currentlySelected) {
        setSelectedHero(currentlySelected)
      }
    } catch (error) {
      console.error('Error loading heroes:', error)
      setError('Failed to load heroes')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectHero = async (hero) => {
    if (!hero.unlocked) {
      if (hero.canUnlock) {
        // Unlock hero
        try {
          const response = await fetch(`${API_URL}/progression/heroes/${user.id}/unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ heroId: hero.id })
          })
          
          if (response.ok) {
            await loadHeroes()
            return
          } else {
            const data = await response.json()
            setError(data.error || 'Failed to unlock hero')
          }
        } catch (error) {
          console.error('Error unlocking hero:', error)
          setError('Failed to unlock hero')
        }
      } else {
        setError(`Requires level ${hero.unlockLevel}`)
      }
      return
    }

    // Select unlocked hero
    try {
      const response = await fetch(`${API_URL}/progression/heroes/${user.id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroId: hero.id })
      })
      
      if (response.ok) {
        setSelectedHero(hero)
        if (onSelect) {
          onSelect(hero)
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to select hero')
      }
    } catch (error) {
      console.error('Error selecting hero:', error)
      setError('Failed to select hero')
    }
  }

  if (loading) {
    return (
      <div className="hero-selection-modal">
        <div className="hero-selection-content">
          <div className="loading-spinner">Loading heroes...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="hero-selection-modal" onClick={onClose}>
      <div className="hero-selection-content" onClick={(e) => e.stopPropagation()}>
        <div className="hero-selection-header">
          <h2>Select Your Hero</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="heroes-grid">
          {heroes.map(hero => (
            <div
              key={hero.id}
              className={`hero-card ${hero.selected ? 'selected' : ''} ${!hero.unlocked ? 'locked' : ''}`}
              style={{ '--hero-color': HERO_COLORS[hero.id] }}
              onClick={() => handleSelectHero(hero)}
            >
              {!hero.unlocked && (
                <div className="locked-overlay">
                  <div className="lock-icon"><Icon name="lock" size={32} color="#ffffff" /></div>
                  <div className="unlock-level">Level {hero.unlockLevel}</div>
                </div>
              )}

              <div className="hero-card-header">
                <div className="hero-icon">{getHeroIcon(hero.id)}</div>
                <div 
                  className="hero-rarity"
                  style={{ color: RARITY_COLORS[hero.rarity] }}
                >
                  {hero.rarity.toUpperCase()}
                </div>
              </div>

              <div className="hero-card-body">
                <h3 className="hero-name">{hero.name}</h3>
                <div className="hero-language">{hero.language}</div>
                <p className="hero-description">{hero.description}</p>

                <div className="hero-stats">
                  <div className="stat-item">
                    <span className="stat-label">HP</span>
                    <span className="stat-value">{hero.stats.baseHealth}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">DMG</span>
                    <span className="stat-value">{hero.stats.baseDamage}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">SPD</span>
                    <span className="stat-value">{hero.stats.baseSpeed.toFixed(1)}</span>
                  </div>
                </div>

                <div className="hero-abilities">
                  <div className="ability">
                    <div className="ability-header">
                      <span className="ability-icon"><Icon name="bolt" size={16} color="#ff0000" /></span>
                      <span className="ability-name">{hero.ability.name}</span>
                    </div>
                    <p className="ability-description">{hero.ability.description}</p>
                    <div className="ability-cooldown">Cooldown: {hero.ability.cooldown}s</div>
                  </div>

                  <div className="ability passive">
                    <div className="ability-header">
                      <span className="ability-icon"><Icon name="diamond" size={16} color="#ffd700" /></span>
                      <span className="ability-name">{hero.passive.name}</span>
                    </div>
                    <p className="ability-description">{hero.passive.description}</p>
                  </div>
                </div>
              </div>

              {hero.selected && (
                <div className="selected-badge">SELECTED</div>
              )}

              {!hero.unlocked && hero.canUnlock && (
                <button className="unlock-btn">Unlock Now</button>
              )}
            </div>
          ))}
        </div>
      </div>
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

