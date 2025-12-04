export class PerformanceManager {
  constructor(game) {
    this.game = game
    this.targetFPS = 60
    this.currentFPS = 60
    this.frameCount = 0
    this.lastTime = performance.now()
    this.fpsHistory = []
    this.qualityLevel = 'high' // high, medium, low
    this.qualityChangeCooldown = 0
    
    this.settings = {
      high: {
        shadows: true,
        particles: 2000,
        bloomStrength: 2.0,
        shadowMapSize: 2048,
        shadowCameraSize: 50,
        maxLights: 10,
        lodEnabled: false
      },
      medium: {
        shadows: true,
        particles: 1000,
        bloomStrength: 1.5,
        shadowMapSize: 1024,
        shadowCameraSize: 40,
        maxLights: 6,
        lodEnabled: true
      },
      low: {
        shadows: false,
        particles: 500,
        bloomStrength: 1.0,
        shadowMapSize: 512,
        shadowCameraSize: 30,
        maxLights: 3,
        lodEnabled: true
      }
    }
  }
  
  startMonitoring() {
    this.monitorInterval = setInterval(() => this.monitorPerformance(), 2000)
  }
  
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
    }
  }
  
  update(deltaTime) {
    this.frameCount++
    const now = performance.now()
    const elapsed = now - this.lastTime
    
    if (elapsed >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / elapsed)
      this.fpsHistory.push(this.currentFPS)
      
      // Keep only last 10 FPS readings
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift()
      }
      
      this.frameCount = 0
      this.lastTime = now
    }
    
    if (this.qualityChangeCooldown > 0) {
      this.qualityChangeCooldown -= deltaTime
    }
  }
  
  monitorPerformance() {
    if (this.fpsHistory.length < 3) return
    if (this.qualityChangeCooldown > 0) return
    
    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
    
    // Downgrade if FPS consistently low
    if (avgFPS < 50 && this.qualityLevel === 'high') {
      this.setQualityLevel('medium')
      console.log('Performance: Downgrading to medium quality')
    } else if (avgFPS < 35 && this.qualityLevel === 'medium') {
      this.setQualityLevel('low')
      console.log('Performance: Downgrading to low quality')
    }
    // Upgrade if FPS consistently high
    else if (avgFPS > 58 && this.qualityLevel === 'low' && this.fpsHistory.every(fps => fps > 55)) {
      this.setQualityLevel('medium')
      console.log('Performance: Upgrading to medium quality')
    } else if (avgFPS > 58 && this.qualityLevel === 'medium' && this.fpsHistory.every(fps => fps > 55)) {
      this.setQualityLevel('high')
      console.log('Performance: Upgrading to high quality')
    }
  }
  
  setQualityLevel(level) {
    if (this.qualityLevel === level) return
    
    this.qualityLevel = level
    this.qualityChangeCooldown = 5 // 5 second cooldown
    this.applyQualitySettings(level)
  }
  
  applyQualitySettings(level) {
    const settings = this.settings[level]
    
    if (!this.game.renderer) return
    
    // Update renderer settings
    if (this.game.renderer.shadowMap) {
      this.game.renderer.shadowMap.enabled = settings.shadows
    }
    
    // Update shadow map size
    if (this.game.scene) {
      this.game.scene.traverse((child) => {
        if (child.isLight && child.shadow) {
          child.shadow.mapSize.width = settings.shadowMapSize
          child.shadow.mapSize.height = settings.shadowMapSize
          if (child.shadow.camera) {
            child.shadow.camera.left = -settings.shadowCameraSize
            child.shadow.camera.right = settings.shadowCameraSize
            child.shadow.camera.top = settings.shadowCameraSize
            child.shadow.camera.bottom = -settings.shadowCameraSize
          }
        }
      })
    }
    
    // Update bloom pass
    if (this.game.composer) {
      const bloomPass = this.game.composer.passes.find(p => p.constructor.name === 'UnrealBloomPass')
      if (bloomPass) {
        bloomPass.strength = settings.bloomStrength
      }
    }
    
    // Update particle counts
    if (this.game.particles) {
      const maxParticles = settings.particles
      if (this.game.particles.geometry) {
        const positions = this.game.particles.geometry.attributes.position.array
        const currentCount = positions.length / 3
        if (currentCount > maxParticles) {
          // Reduce particle count
          this.game.particles.geometry.setDrawRange(0, maxParticles)
        }
      }
    }
    
    // Notify game about quality change
    if (this.game.onQualityChange) {
      this.game.onQualityChange(level, settings)
    }
  }
  
  getCurrentSettings() {
    return this.settings[this.qualityLevel]
  }
  
  getFPS() {
    return this.currentFPS
  }
  
  getQualityLevel() {
    return this.qualityLevel
  }
}

