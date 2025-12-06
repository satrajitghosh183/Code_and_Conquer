import { useEffect, useState } from 'react'
import { Icon } from './Icons'
import './BuildBar.css'

const BUILDABLES = [
  // Towers
  { id: 'gattling', name: 'Gatling', cost: 50, hotkey: '1', iconName: 'tower', type: 'tower', towerType: 'gattling', desc: 'Fast fire' },
  { id: 'missile', name: 'Missile', cost: 150, hotkey: '2', iconName: 'cannon', type: 'tower', towerType: 'missile', desc: 'Splash' },
  { id: 'laser', name: 'Laser', cost: 200, hotkey: '3', iconName: 'lightning', type: 'tower', towerType: 'laser', desc: 'Beam' },
  { id: 'sniper', name: 'Sniper', cost: 120, hotkey: '4', iconName: 'target', type: 'tower', towerType: 'sniper', desc: 'Range' },
  { id: 'frost', name: 'Frost', cost: 100, hotkey: '5', iconName: 'ice', type: 'tower', towerType: 'frost', desc: 'Slow' },
  { id: 'fire', name: 'Fire', cost: 100, hotkey: '6', iconName: 'fire', type: 'tower', towerType: 'fire', desc: 'Burn' },
  { id: 'tesla', name: 'Tesla', cost: 180, hotkey: '7', iconName: 'bolt', type: 'tower', towerType: 'tesla', desc: 'Chain' },
  // Walls
  { id: 'wall', name: 'Wall', cost: 50, hotkey: '8', iconName: 'wall', type: 'wall', wallType: 'maze', desc: 'Block' },
  // Spawner
  { id: 'spawner', name: 'Barracks', cost: 250, hotkey: '9', iconName: 'swords', type: 'spawner', spawnerType: 'barracks', desc: 'Troops' }
]

export default function BuildBar({ gold, selectedStructure, onSelect, availableStructures = [] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      // Toggle build bar with B
      if (e.key === 'b' || e.key === 'B') {
        setIsExpanded(prev => !prev)
        return
      }
      
      const buildable = BUILDABLES.find(b => b.hotkey === e.key)
      if (buildable && gold >= buildable.cost) {
        e.preventDefault()
        onSelect(buildable.id)
        setIsExpanded(false) // Close after selection
      }
      
      // ESC to cancel
      if (e.key === 'Escape') {
        onSelect(null)
        setIsExpanded(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onSelect, gold])
  
  const isAvailable = (buildable) => {
    if (availableStructures.length === 0) return true
    if (buildable.type === 'tower') {
      return availableStructures.includes(buildable.towerType) || availableStructures.includes('basic')
    }
    return true
  }
  
  return (
    <div className={`build-bar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button 
        className="build-bar-toggle" 
        onClick={() => setIsExpanded(!isExpanded)}
        title="Press B to toggle"
      >
        <Icon name={isExpanded ? 'close' : 'tower'} size={16} color="#00ddff" />
        <span>{isExpanded ? 'Close' : 'Build [B]'}</span>
      </button>
      
      {isExpanded && (
        <>
          <div className="build-items">
            {BUILDABLES.map(item => {
              const canAfford = gold >= item.cost
              const available = isAvailable(item)
              const isSelected = selectedStructure === item.id
              
              return (
                <button
                  key={item.id}
                  className={`build-item ${isSelected ? 'selected' : ''} ${!canAfford ? 'disabled' : ''} ${!available ? 'locked' : ''}`}
                  onClick={() => {
                    if (canAfford && available) {
                      onSelect(item.id)
                      setIsExpanded(false)
                    }
                  }}
                  disabled={!canAfford || !available}
                  title={`${item.name} - ${item.desc} (${item.cost}g)`}
                >
                  <div className="build-icon"><Icon name={item.iconName} size={20} color={isSelected ? "#ffff00" : "#00ddff"} /></div>
                  <div className="build-info">
                    <div className="build-name">{item.name}</div>
                    <div className="build-cost">{item.cost}g</div>
                  </div>
                  <div className="build-hotkey">{item.hotkey}</div>
                </button>
              )
            })}
          </div>
          <div className="build-hint">
            <kbd>ESC</kbd> cancel • <kbd>R</kbd> rotate • <kbd>B</kbd> close
          </div>
        </>
      )}
      
      {selectedStructure && !isExpanded && (
        <div className="selected-indicator">
          Selected: {BUILDABLES.find(b => b.id === selectedStructure)?.name || selectedStructure}
        </div>
      )}
    </div>
  )
}

