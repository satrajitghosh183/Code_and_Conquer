import { useState, useEffect } from 'react'
import './StructureSelectionPanel.css'

export default function StructureSelectionPanel({ 
  structures = [], 
  base = null,
  isVisible, 
  onSelect, 
  onClose,
  selectedStructure = null,
  onRotate,
  onMove
}) {
  const [rotationAxis, setRotationAxis] = useState('y') // 'x', 'y', 'z'
  const [rotationAmount, setRotationAmount] = useState(15) // degrees

  if (!isVisible) return null

  // Combine structures and base for display
  const allItems = []
  
  if (base && base.position) {
    allItems.push({
      id: 'base',
      name: 'Base Tower',
      type: 'base',
      position: base.position || { x: 0, y: 0, z: 0 },
      level: base.level || 1
    })
  }

  if (structures && Array.isArray(structures)) {
    structures.forEach((structure, index) => {
      if (!structure || structure.isDestroyed) return
    
    let name = 'Unknown'
    if (structure.type === 'tower') {
      name = `${structure.towerType || 'Tower'} (Level ${structure.level || 1})`
    } else if (structure.type === 'wall') {
      name = `Wall (${structure.wallType || 'maze'})`
    } else if (structure.type === 'spawner') {
      name = `Barracks (${structure.spawnerType || 'barracks'})`
    } else if (structure.type === 'resource_generator') {
      const genType = structure.generatorType || 'generator'
      const genNames = {
        'gold_mine': 'Gold Mine',
        'energy_well': 'Energy Well',
        'hybrid_generator': 'Hybrid Generator'
      }
      name = genNames[genType] || 'Generator'
    }
    
    allItems.push({
      id: `structure-${index}`,
      structure: structure,
      name: name,
      type: structure.type,
      position: structure.position || { x: 0, y: 0, z: 0 },
      rotation: structure.rotation || 0
    })
  })

  const handleRotate = (axis, amount) => {
    if (selectedStructure && onRotate) {
      onRotate(selectedStructure, axis, amount)
    }
  }

  const handleMove = () => {
    if (selectedStructure && onMove) {
      onMove(selectedStructure)
    }
  }

  return (
    <div className="structure-selection-panel">
      <div className="panel-header">
        <h3>Select Structure</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        <div className="structures-list">
          <h4>Placed Structures ({allItems.length})</h4>
          <div className="structures-scroll">
            {allItems.length === 0 ? (
              <div className="no-structures">No structures placed yet</div>
            ) : (
              allItems.map((item) => {
                const isSelected = selectedStructure && (
                  (item.id === 'base' && selectedStructure.type === 'base') ||
                  (item.structure && selectedStructure === item.structure)
                )
                
                return (
                  <div
                    key={item.id}
                    className={`structure-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelect(item.structure || item)}
                  >
                    <div className="structure-name">{item.name}</div>
                    <div className="structure-info">
                      <span>Type: {item.type}</span>
                      <span>Pos: ({item.position.x.toFixed(1)}, {item.position.z.toFixed(1)})</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {selectedStructure && (
          <div className="structure-controls">
            <h4>Controls</h4>
            
            <div className="control-section">
              <label>Rotation Axis:</label>
              <div className="axis-buttons">
                <button 
                  className={rotationAxis === 'x' ? 'active' : ''}
                  onClick={() => setRotationAxis('x')}
                >
                  X
                </button>
                <button 
                  className={rotationAxis === 'y' ? 'active' : ''}
                  onClick={() => setRotationAxis('y')}
                >
                  Y
                </button>
                <button 
                  className={rotationAxis === 'z' ? 'active' : ''}
                  onClick={() => setRotationAxis('z')}
                >
                  Z
                </button>
              </div>
            </div>

            <div className="control-section">
              <label>Rotation Amount:</label>
              <div className="rotation-amount">
                <button onClick={() => setRotationAmount(15)} className={rotationAmount === 15 ? 'active' : ''}>15°</button>
                <button onClick={() => setRotationAmount(45)} className={rotationAmount === 45 ? 'active' : ''}>45°</button>
                <button onClick={() => setRotationAmount(90)} className={rotationAmount === 90 ? 'active' : ''}>90°</button>
              </div>
            </div>

            <div className="control-section">
              <label>Rotate:</label>
              <div className="rotate-buttons">
                <button onClick={() => handleRotate(rotationAxis, rotationAmount)}>
                  +{rotationAmount}° {rotationAxis.toUpperCase()}
                </button>
                <button onClick={() => handleRotate(rotationAxis, -rotationAmount)}>
                  -{rotationAmount}° {rotationAxis.toUpperCase()}
                </button>
              </div>
            </div>

            <div className="control-section">
              <button className="move-btn" onClick={handleMove}>
                Enable Move Mode
              </button>
              <p className="help-text">Click on map to move structure</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

