import { useState } from 'react'
import { Icon } from './Icons'
import './WaveSendPanel.css'

// Wave types that can be sent to opponent
const WAVE_TYPES = [
  { 
    id: 'spider', 
    name: 'Spider Swarm', 
    cost: 10, 
    incomeBonus: 2, 
    description: 'Fast and numerous',
    color: '#00ff44',
    icon: 'bug'
  },
  { 
    id: 'scout', 
    name: 'Scout Rush', 
    cost: 15, 
    incomeBonus: 3, 
    description: 'Lightning fast',
    color: '#00ffff',
    icon: 'lightning'
  },
  { 
    id: 'swarm', 
    name: 'Swarmlings', 
    cost: 5, 
    incomeBonus: 1, 
    description: 'Overwhelming numbers',
    color: '#ffff00',
    icon: 'dots'
  },
  { 
    id: 'brute', 
    name: 'Heavy Brute', 
    cost: 40, 
    incomeBonus: 8, 
    description: 'Slow but durable',
    color: '#ff6600',
    icon: 'shield'
  },
  { 
    id: 'armored', 
    name: 'Armored Unit', 
    cost: 50, 
    incomeBonus: 10, 
    description: 'High armor',
    color: '#888888',
    icon: 'armor'
  },
  { 
    id: 'healer', 
    name: 'Bio-Medic', 
    cost: 35, 
    incomeBonus: 7, 
    description: 'Heals nearby allies',
    color: '#00ff88',
    icon: 'heart'
  },
  { 
    id: 'boss', 
    name: 'Hive Queen', 
    cost: 200, 
    incomeBonus: 40, 
    description: 'Devastating boss!',
    color: '#ff0000',
    icon: 'crown',
    requiresUnlock: true
  }
]

export default function WaveSendPanel({ 
  gold = 500, 
  income = 20, 
  onSendWave, 
  disabled = false,
  unlockedWaves = ['spider', 'scout', 'swarm', 'brute', 'armored', 'healer'],
  phase = 'combat'
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedQuantity, setSelectedQuantity] = useState(5)
  const [hoveredWave, setHoveredWave] = useState(null)
  
  const quantities = [1, 5, 10]
  
  const handleSendWave = (waveType) => {
    const wave = WAVE_TYPES.find(w => w.id === waveType)
    if (!wave) return
    
    const totalCost = wave.cost * selectedQuantity
    if (gold < totalCost) return
    if (disabled) return
    if (phase !== 'combat') return
    
    if (onSendWave) {
      onSendWave(waveType, selectedQuantity, totalCost)
    }
  }
  
  const isUnlocked = (waveId) => {
    return unlockedWaves.includes(waveId)
  }
  
  const canAfford = (waveCost) => {
    return gold >= waveCost * selectedQuantity
  }
  
  return (
    <div className={`wave-send-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button 
        className="wave-panel-toggle" 
        onClick={() => setIsExpanded(!isExpanded)}
        title="Send waves to attack opponent"
      >
        <Icon name="swords" size={16} color="#ff6600" />
        <span>{isExpanded ? 'Close' : 'Attack [A]'}</span>
      </button>
      
      {isExpanded && (
        <div className="wave-panel-content">
          <div className="wave-panel-header">
            <h3>Send Wave</h3>
            <div className="income-display">
              <Icon name="coins" size={14} color="#ffd700" />
              <span>Income: +{income}/turn</span>
            </div>
          </div>
          
          {phase !== 'combat' && (
            <div className="phase-warning">
              ⚠️ Waves can only be sent during combat phase!
            </div>
          )}
          
          <div className="quantity-selector">
            <span>Quantity:</span>
            {quantities.map(qty => (
              <button 
                key={qty}
                className={`qty-btn ${selectedQuantity === qty ? 'selected' : ''}`}
                onClick={() => setSelectedQuantity(qty)}
              >
                x{qty}
              </button>
            ))}
          </div>
          
          <div className="wave-grid">
            {WAVE_TYPES.map(wave => {
              const isLocked = wave.requiresUnlock && !isUnlocked(wave.id)
              const affordable = canAfford(wave.cost)
              const totalCost = wave.cost * selectedQuantity
              const totalIncome = wave.incomeBonus * selectedQuantity
              
              return (
                <button
                  key={wave.id}
                  className={`wave-item ${!affordable ? 'disabled' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => !isLocked && affordable && handleSendWave(wave.id)}
                  onMouseEnter={() => setHoveredWave(wave)}
                  onMouseLeave={() => setHoveredWave(null)}
                  disabled={disabled || !affordable || isLocked || phase !== 'combat'}
                  style={{ '--wave-color': wave.color }}
                >
                  <div className="wave-icon">
                    <Icon name={wave.icon} size={24} color={wave.color} />
                  </div>
                  <div className="wave-info">
                    <div className="wave-name">{wave.name}</div>
                    <div className="wave-cost">
                      <span className="cost">{totalCost}g</span>
                      <span className="income">+{totalIncome}</span>
                    </div>
                  </div>
                  {isLocked && (
                    <div className="lock-overlay">
                      <Icon name="lock" size={16} color="#888" />
                      <span>Unlock</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          
          {hoveredWave && (
            <div className="wave-tooltip">
              <strong style={{ color: hoveredWave.color }}>{hoveredWave.name}</strong>
              <p>{hoveredWave.description}</p>
              <div className="tooltip-stats">
                <span>Cost: {hoveredWave.cost * selectedQuantity}g</span>
                <span>Income: +{hoveredWave.incomeBonus * selectedQuantity}/turn</span>
              </div>
            </div>
          )}
          
          <div className="wave-hint">
            <kbd>A</kbd> toggle • Click to send
          </div>
        </div>
      )}
    </div>
  )
}

