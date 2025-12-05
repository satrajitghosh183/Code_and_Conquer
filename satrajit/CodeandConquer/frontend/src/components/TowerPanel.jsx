import './TowerPanel.css'
import { Icon } from './Icons'

export default function TowerPanel({ tower, upgradeCost, gold, onUpgrade, onSell }) {
  if (!tower) return null
  const canUpgrade = upgradeCost !== null && upgradeCost !== undefined && gold >= upgradeCost && tower.level < 3
  
  return (
    <div className="tower-panel">
      <div className="tower-header">
        <div className="tower-name">{tower.name}</div>
        <div className="tower-level">Lv.{tower.level}</div>
      </div>
      <div className="tower-stats">
        <div className="stat"><span>Damage</span><span>{tower.damage}</span></div>
        <div className="stat"><span>Range</span><span>{tower.range}</span></div>
        <div className="stat"><span>Fire Rate</span><span>{tower.fireRate.toFixed(2)}/s</span></div>
        {tower.energyCost > 0 && (
          <div className="stat energy"><span>Energy/Shot</span><span>{tower.energyCost}</span></div>
        )}
        <div className="stat"><span>Kills</span><span>{tower.kills}</span></div>
      </div>
      <div className="tower-actions">
        <button 
          className={`upgrade-btn ${canUpgrade ? '' : 'disabled'}`} 
          onClick={onUpgrade}
          disabled={!canUpgrade}
          title={canUpgrade ? `Upgrade (${upgradeCost}g)` : 'Cannot upgrade'}
        >
          <Icon name="arrow_up" size={14} color="#fff" /> Upgrade {upgradeCost ? `(${upgradeCost}g)` : ''}
        </button>
        <button 
          className="sell-btn" 
          onClick={onSell}
          title="Sell tower for partial refund"
        >
          <Icon name="trash" size={14} color="#fff" /> Sell
        </button>
      </div>
    </div>
  )
}

