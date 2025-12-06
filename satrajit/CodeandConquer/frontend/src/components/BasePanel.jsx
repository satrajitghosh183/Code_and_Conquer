import { useState, useEffect } from 'react'
import './BasePanel.css'
import { Icon } from './Icons'

export default function BasePanel({ baseStats, gold, onUpgrade }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!baseStats) return null
  
  const canUpgrade = baseStats.nextUpgradeCost !== Infinity && gold >= baseStats.nextUpgradeCost
  const isMaxLevel = baseStats.nextUpgradeCost === Infinity
  
  return (
    <div className={`base-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button 
        className="base-panel-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Base Info"
      >
        <Icon name="castle" size={18} color="#ff6600" />
        <span className="base-name">{baseStats.name}</span>
        <span className="base-level">Lv.{baseStats.level}</span>
      </button>
      
      {isExpanded && (
        <div className="base-details">
          <div className="base-stats">
            <div className="base-stat">
              <span className="stat-label">Health</span>
              <span className="stat-value">{Math.floor(baseStats.health)}/{baseStats.maxHealth}</span>
            </div>
            <div className="base-stat">
              <span className="stat-label">Health Regen</span>
              <span className="stat-value">{baseStats.healthRegen}/s</span>
            </div>
            <div className="base-stat">
              <span className="stat-label">Defense Range</span>
              <span className="stat-value">{baseStats.range}</span>
            </div>
            <div className="base-stat">
              <span className="stat-label">Defense Damage</span>
              <span className="stat-value">{baseStats.damage}</span>
            </div>
          </div>
          
          <div className="base-upgrade-section">
            {isMaxLevel ? (
              <div className="max-level-badge">
                <Icon name="star" size={14} color="#ffd700" />
                <span>MAX LEVEL</span>
              </div>
            ) : (
              <button 
                className={`base-upgrade-btn ${canUpgrade ? 'available' : 'disabled'}`}
                onClick={onUpgrade}
                disabled={!canUpgrade}
                title={canUpgrade ? `Upgrade to next level (${baseStats.nextUpgradeCost}g)` : `Need ${baseStats.nextUpgradeCost}g to upgrade`}
              >
                <Icon name="arrow_up" size={14} color="#fff" />
                <span>Upgrade Base</span>
                <span className="upgrade-cost">{baseStats.nextUpgradeCost}g</span>
              </button>
            )}
          </div>
          
          <div className="base-upgrade-preview">
            {!isMaxLevel && (
              <div className="preview-text">
                <Icon name="info" size={12} color="#88aaff" />
                <span>Upgrading increases health, regen, range & damage</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

