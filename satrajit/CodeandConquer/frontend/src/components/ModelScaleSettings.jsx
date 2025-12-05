import { useState, useEffect } from 'react'
import { modelLoader } from '../game/ModelLoader'
import { MODEL_SCALES, TARGET_SIZES } from '../game/ModelLoader'
import './ModelScaleSettings.css'

export default function ModelScaleSettings({ onClose }) {
  const [userScales, setUserScales] = useState({})
  const [autoScaleEnabled, setAutoScaleEnabled] = useState(true)
  const [selectedModel, setSelectedModel] = useState(null)

  useEffect(() => {
    // Load current settings
    setUserScales(modelLoader.getAllUserScales())
    setAutoScaleEnabled(modelLoader.autoScaleEnabled)
  }, [])

  const availableModels = modelLoader.getAvailableModels()
  const modelCategories = {
    'Towers': ['watch_tower', 'heavy_cannon', 'medieval_towers', 'kickelhahn', 'cannon'],
    'Walls': ['castle_walls'],
    'Units': ['troop'],
    'Heroes': ['snake', 'dragon'],
    'Special': ['mortar', 'astro_shedder']
  }

  const handleScaleChange = (modelKey, newScale) => {
    const updated = { ...userScales, [modelKey]: parseFloat(newScale) }
    setUserScales(updated)
    modelLoader.setUserScale(modelKey, parseFloat(newScale))
  }

  const handleAutoScaleToggle = (enabled) => {
    setAutoScaleEnabled(enabled)
    modelLoader.setAutoScaleEnabled(enabled)
  }

  const resetModelScale = (modelKey) => {
    const updated = { ...userScales }
    delete updated[modelKey]
    setUserScales(updated)
    modelLoader.setUserScale(modelKey, undefined)
  }

  const resetAllScales = () => {
    if (window.confirm('Reset all model scales to defaults?')) {
      setUserScales({})
      modelLoader.resetUserScales()
    }
  }

  const getCurrentScale = (modelKey) => {
    return userScales[modelKey] ?? MODEL_SCALES[modelKey] ?? 0.2
  }

  const getTargetSize = (modelKey) => {
    return TARGET_SIZES[modelKey]
  }

  const getCurrentSize = (modelKey) => {
    return modelLoader.getCurrentSize(modelKey)
  }

  return (
    <div className="model-scale-settings-overlay" onClick={onClose}>
      <div className="model-scale-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="model-scale-settings-header">
          <h2>Model Scale Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="model-scale-settings-content">
          <div className="auto-scale-section">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={autoScaleEnabled}
                onChange={(e) => handleAutoScaleToggle(e.target.checked)}
              />
              <span>Automatic Scaling</span>
            </label>
            <p className="help-text">
              Automatically scale models to target sizes based on their bounding boxes.
              When disabled, uses manual scale values.
            </p>
          </div>

          <div className="models-list">
            {Object.entries(modelCategories).map(([category, models]) => (
              <div key={category} className="model-category">
                <h3>{category}</h3>
                {models.filter(m => availableModels.includes(m)).map(modelKey => {
                  const currentScale = getCurrentScale(modelKey)
                  const targetSize = getTargetSize(modelKey)
                  const currentSize = getCurrentSize(modelKey)
                  const isCustom = userScales[modelKey] !== undefined

                  return (
                    <div key={modelKey} className="model-scale-item">
                      <div className="model-info">
                        <span className="model-name">{modelKey}</span>
                        {targetSize && (
                          <span className="model-size-info">
                            Target: {targetSize.toFixed(1)}u
                            {currentSize && ` | Current: ${currentSize.toFixed(1)}u`}
                          </span>
                        )}
                        {isCustom && <span className="custom-badge">Custom</span>}
                      </div>
                      <div className="scale-controls">
                        <input
                          type="range"
                          min="0.05"
                          max="2.0"
                          step="0.05"
                          value={currentScale}
                          onChange={(e) => handleScaleChange(modelKey, e.target.value)}
                          className="scale-slider"
                        />
                        <input
                          type="number"
                          min="0.05"
                          max="2.0"
                          step="0.05"
                          value={currentScale.toFixed(2)}
                          onChange={(e) => handleScaleChange(modelKey, e.target.value)}
                          className="scale-input"
                        />
                        {isCustom && (
                          <button
                            className="reset-btn"
                            onClick={() => resetModelScale(modelKey)}
                            title="Reset to default"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="settings-actions">
            <button className="reset-all-btn" onClick={resetAllScales}>
              Reset All to Defaults
            </button>
            <button className="close-action-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

