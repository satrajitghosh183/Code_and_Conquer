// Sound Manager - Integrated from dabbott/towerdefense
// HTML5 Audio with queue management and rate limiting

class SoundManagerClass {
  constructor() {
    this.sounds = {}
    this.queue = {}
    this.timer = {}
    this.muted = false
    this.volume = 0.5
    this.speed = 1.0
  }

  add(name, path) {
    this.sounds[name] = path || `/sounds/${name}`
  }

  play(name) {
    if (!this.sounds[name]) {
      this.add(name, `/sounds/${name}`)
      this.timer[name] = 0
    }
    this.queue[name] = true
  }

  update(delta) {
    delta = delta / this.speed

    for (const name in this.queue) {
      if (this.timer[name] === 0 && !this.muted) {
        try {
          const audio = new Audio(this.sounds[name])
          audio.volume = this.volume
          audio.play().catch(() => {
            // Audio play failed (user interaction required)
          })
          delete this.queue[name]
          
          // Rate limiting - prevent sound spam
          this.timer[name] = name === 'explosion.ogg' ? 400 : 200
        } catch (e) {
          console.warn('Sound play failed:', name, e)
        }
      } else {
        this.timer[name] = Math.max(0, this.timer[name] - delta)
      }
    }
  }

  setMuted(muted) {
    this.muted = muted
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  preloadSounds() {
    // Preload common sounds
    const soundList = [
      'gattling.ogg',
      'missile.ogg',
      'laser.ogg',
      'explosion.ogg',
      'theme.ogg'
    ]
    
    soundList.forEach(sound => {
      this.add(sound)
    })
  }
}

export const SoundManager = new SoundManagerClass()

