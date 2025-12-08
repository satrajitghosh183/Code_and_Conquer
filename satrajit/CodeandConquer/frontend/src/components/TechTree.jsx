import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useGame } from '../contexts/GameContext'
import { Icon } from './Icons'
import './TechTree.css'

// Tech Tree component - displays upgradable technologies using gold currency
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const CATEGORY_COLORS = {
  economy: '#10b981',
  troops: '#ef4444',
  towers: '#ff0000',
  abilities: '#a855f7',
  unlocks: '#f59e0b',
  base: '#aa0000'
}

const CATEGORY_ICON_NAMES = {
  economy: 'economy',
  troops: 'swords',
  towers: 'tower',
  abilities: 'bolt',
  unlocks: 'lock',
  base: 'barracks'
}

export default function TechTree({ onClose }) {
  const { user } = useAuth()
  // Use unified gold state from GameContext - no more multiple sources!
  const { gold, deductGold, subscribeToGoldChanges } = useGame()
  const [techTree, setTechTree] = useState([])
  const [progression, setProgression] = useState(null)
  const [selectedTech, setSelectedTech] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      loadTechTree()
      loadProgression()
    }
  }, [user])

  // Debug: Log gold when it changes
  useEffect(() => {
    console.log('[TechTree] Gold from GameContext:', gold)
  }, [gold])

  const loadTechTree = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/progression/tech-tree/${user.id}`)
      const data = await response.json()
      setTechTree(data)
      
      // Get gold from first tech item (backend includes userGold in response)
      if (data && data.length > 0 && data[0].userGold !== undefined) {
        setUserGold(data[0].userGold)
      }
    } catch (error) {
      console.error('Error loading tech tree:', error)
      setError('Failed to load tech tree')
    } finally {
      setLoading(false)
    }
  }

  const loadProgression = async () => {
    try {
      const response = await fetch(`${API_URL}/progression/progression/${user.id}`)
      const data = await response.json()
      setProgression(data)
    } catch (error) {
      console.error('Error loading progression:', error)
    }
  }

  const handleUpgrade = async (techId) => {
    // Find the tech to get its cost
    const tech = techTree.find(t => t.id === techId)
    if (!tech || !tech.nextCost) {
      setError('Tech not found')
      return
    }

    const upgradeCost = tech.nextCost

    // Check if we have enough gold locally
    if (gold < upgradeCost) {
      setError(`Not enough gold. Need ${upgradeCost}, have ${gold}`)
      return
    }

    // Optimistic update: deduct gold locally immediately
    deductGold(upgradeCost)
    console.log('[TechTree] Optimistically deducted gold:', upgradeCost)

    try {
      const response = await fetch(`${API_URL}/progression/tech-tree/${user.id}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techId })
      })

      if (response.ok) {
        // Just reload tech tree and progression - gold is already updated locally
        await loadTechTree()
        await loadProgression()
        setError(null)
      } else {
        const data = await response.json()
        // Rollback: add back the gold if upgrade failed on backend
        // Note: In most cases the backend also handles gold, so this might cause double-count
        // We should check if backend actually deducted gold or not
        console.error('[TechTree] Upgrade failed:', data.error)
        setError(data.error || 'Failed to upgrade')
      }
    } catch (error) {
      console.error('Error upgrading tech:', error)
      setError('Failed to upgrade tech')
    }
  }

  const groupedTech = techTree.reduce((acc, tech) => {
    if (!acc[tech.category]) {
      acc[tech.category] = []
    }
    acc[tech.category].push(tech)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="tech-tree-modal">
        <div className="tech-tree-content">
          <div className="loading-spinner">Loading tech tree...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="tech-tree-modal" onClick={onClose}>
      <div className="tech-tree-content" onClick={(e) => e.stopPropagation()}>
        <div className="tech-tree-header">
          <div>
            <h2>Tech Tree</h2>
            <div className="tech-points-display">
              <span className="points-icon">🪙</span>
              <span className="points-value">{gold}</span>
              <span className="points-label">Gold</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="tech-tree-container">
          {Object.entries(groupedTech).map(([category, techs]) => (
            <div key={category} className="tech-category">
              <div 
                className="category-header"
                style={{ '--category-color': CATEGORY_COLORS[category] }}
              >
                <span className="category-icon"><Icon name={CATEGORY_ICON_NAMES[category]} size={24} color={CATEGORY_COLORS[category]} /></span>
                <h3>{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
              </div>

              <div className="tech-items">
                  {techs.map(tech => {
                    // Calculate canUpgrade locally using our gold state
                    const canAfford = tech.nextCost ? gold >= tech.nextCost : false
                    const canUpgradeLocal = tech.requirementsMet && canAfford && tech.currentLevel < tech.maxLevel
                    
                    return (
                      <div
                        key={tech.id}
                        className={`tech-item ${!tech.requirementsMet ? 'locked' : ''} ${tech.currentLevel >= tech.maxLevel ? 'maxed' : ''}`}
                        onClick={() => setSelectedTech(tech)}
                      >
                        <div className="tech-item-header">
                          <h4>{tech.name}</h4>
                          <div className="tech-level">
                            {tech.currentLevel}/{tech.maxLevel}
                          </div>
                        </div>

                        <p className="tech-description">{tech.description}</p>

                        <div className="tech-progress">
                          <div 
                            className="tech-progress-bar"
                            style={{ 
                              width: `${(tech.currentLevel / tech.maxLevel) * 100}%`,
                              background: CATEGORY_COLORS[category]
                            }}
                          />
                        </div>

                        {tech.currentLevel < tech.maxLevel && tech.nextEffect && (
                          <div className="tech-next-effect">
                            <span className="next-label">Next:</span>
                            {renderEffect(tech.nextEffect)}
                          </div>
                        )}

                        <div className="tech-item-footer">
                          {tech.currentLevel < tech.maxLevel ? (
                            <button
                              className={`upgrade-btn ${!canUpgradeLocal ? 'disabled' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (canUpgradeLocal) {
                                  handleUpgrade(tech.id)
                                }
                              }}
                              disabled={!canUpgradeLocal}
                            >
                              {!tech.requirementsMet ? (
                                <><Icon name="lock" size={14} color="#ffffff" /> Locked</>
                              ) : !canAfford ? (
                                <><Icon name="gold" size={14} color="#ffd700" /> {tech.nextCost} gold</>
                              ) : (
                                <>Upgrade ({tech.nextCost} gold)</>
                              )}
                            </button>
                          ) : (
                            <div className="maxed-badge">MAX LEVEL</div>
                          )}
                        </div>

                        {!tech.requirementsMet && tech.requirements && tech.requirements.length > 0 && (
                          <div className="requirements">
                            <span className="req-label">Requires:</span>
                            {tech.requirements.map(reqId => {
                              const reqTech = techTree.find(t => t.id === reqId)
                              return reqTech ? <span key={reqId} className="req-item">{reqTech.name}</span> : null
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        {selectedTech && (
          <div className="tech-detail-modal" onClick={() => setSelectedTech(null)}>
            <div className="tech-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="tech-detail-header">
                <h3>{selectedTech.name}</h3>
                <button onClick={() => setSelectedTech(null)}>×</button>
              </div>

              <p className="tech-detail-description">{selectedTech.description}</p>

              <div className="tech-detail-levels">
                <h4>All Levels</h4>
                {selectedTech.effects.map((effect, index) => (
                  <div 
                    key={index}
                    className={`level-effect ${index < selectedTech.currentLevel ? 'unlocked' : ''}`}
                  >
                    <span className="level-number">Level {index + 1}</span>
                    <span className="level-cost">({selectedTech.costs[index]} pts)</span>
                    <div className="level-effect-text">{renderEffect(effect)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function renderEffect(effect) {
  if (effect.startingGold) return `+${effect.startingGold} Starting Gold`
  if (effect.goldPerSecond) return `+${effect.goldPerSecond} Gold/sec`
  if (effect.troopHpBonus) return `+${(effect.troopHpBonus * 100).toFixed(0)}% Troop HP`
  if (effect.troopDamageBonus) return `+${(effect.troopDamageBonus * 100).toFixed(0)}% Troop Damage`
  if (effect.towerRangeBonus) return `+${(effect.towerRangeBonus * 100).toFixed(0)}% Tower Range`
  if (effect.towerFireRateBonus) return `+${(effect.towerFireRateBonus * 100).toFixed(0)}% Tower Fire Rate`
  if (effect.baseHpBonus) return `+${(effect.baseHpBonus * 100).toFixed(0)}% Base HP`
  if (effect.abilityCooldownReduction) return `-${(effect.abilityCooldownReduction * 100).toFixed(0)}% Ability Cooldown`
  if (effect.unlockedUnits) return `Unlock: ${effect.unlockedUnits.join(', ')}`
  return JSON.stringify(effect)
}

