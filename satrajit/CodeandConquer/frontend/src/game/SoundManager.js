// Enhanced Sound Manager with Web Audio API
// Features: Spatial 3D audio, multiple channels, dynamic music, sound pooling

import * as THREE from 'three'

class SoundManagerClass {
  constructor() {
    // Web Audio API context
    this.audioContext = null
    this.masterGain = null
    this.sfxGain = null
    this.musicGain = null
    this.listener = null

    // Sound library and buffers
    this.sounds = {}
    this.buffers = {}
    this.loadingPromises = {}

    // Active sound sources
    this.activeSources = []
    this.musicSource = null
    this.currentMusic = null

    // Settings
    this.muted = false
    this.masterVolume = 0.7
    this.sfxVolume = 0.8
    this.musicVolume = 0.4
    this.speed = 1.0

    // Rate limiting
    this.timer = {}
    this.queue = []

    // Camera reference for spatial audio
    this.camera = null

    // Music crossfade state
    this.musicTransitioning = false
    this.musicFadeDuration = 2000 // 2 seconds

    // Load settings from localStorage
    this.loadSettings()
  }

  // Initialize Web Audio API (must be called after user interaction)
  async initialize(camera = null) {
    if (this.audioContext) return // Already initialized

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()

      // Create gain nodes for volume control
      this.masterGain = this.audioContext.createGain()
      this.sfxGain = this.audioContext.createGain()
      this.musicGain = this.audioContext.createGain()

      // Connect gain nodes
      this.sfxGain.connect(this.masterGain)
      this.musicGain.connect(this.masterGain)
      this.masterGain.connect(this.audioContext.destination)

      // Set initial volumes
      this.updateVolumes()

      // Set camera for spatial audio
      if (camera) {
        this.setCamera(camera)
      }

      console.log('SoundManager: Web Audio API initialized')
    } catch (error) {
      console.error('Failed to initialize Web Audio API:', error)
    }
  }

  // Set camera for spatial audio calculations
  setCamera(camera) {
    this.camera = camera
  }

  // Add sound to library
  add(name, path, options = {}) {
    this.sounds[name] = {
      path: path || `/sounds/${name}`,
      pool: options.pool || 5, // Number of simultaneous instances
      spatial: options.spatial !== false, // 3D spatial audio by default
      loop: options.loop || false,
      volume: options.volume || 1.0,
      rateLimit: options.rateLimit || 200 // ms between plays
    }
    this.timer[name] = 0
  }

  // Preload sound buffer
  async load(name) {
    if (!this.audioContext) {
      console.warn('AudioContext not initialized. Call initialize() first.')
      return null
    }

    if (this.buffers[name]) {
      return this.buffers[name]
    }

    if (this.loadingPromises[name]) {
      return this.loadingPromises[name]
    }

    const soundData = this.sounds[name]
    if (!soundData) {
      console.warn(`Sound "${name}" not found in library`)
      return null
    }

    this.loadingPromises[name] = fetch(soundData.path)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        this.buffers[name] = audioBuffer
        delete this.loadingPromises[name]
        return audioBuffer
      })
      .catch(error => {
        console.error(`Failed to load sound "${name}":`, error)
        delete this.loadingPromises[name]
        return null
      })

    return this.loadingPromises[name]
  }

  // Play sound (2D, no spatial audio)
  async play(name, options = {}) {
    return this.play3D(name, null, options)
  }

  // Play sound with 3D spatial audio
  async play3D(name, position = null, options = {}) {
    if (!this.audioContext || this.muted) return null

    // Rate limiting check
    if (this.timer[name] > 0) return null

    // Ensure buffer is loaded
    if (!this.buffers[name]) {
      await this.load(name)
    }

    const buffer = this.buffers[name]
    if (!buffer) return null

    const soundData = this.sounds[name]
    if (!soundData) return null

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    // Create source
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = this.speed

    // Create gain for individual sound volume
    const gain = this.audioContext.createGain()
    const finalVolume = (options.volume ?? soundData.volume) * this.sfxVolume
    gain.gain.value = finalVolume

    let panner = null

    // Add spatial audio if position is provided and sound supports it
    if (position && soundData.spatial && this.camera) {
      panner = this.audioContext.createPanner()

      // Configure panner
      panner.panningModel = 'HRTF' // Head-related transfer function for realistic 3D audio
      panner.distanceModel = 'inverse'
      panner.refDistance = 10
      panner.maxDistance = 100
      panner.rolloffFactor = 1
      panner.coneInnerAngle = 360
      panner.coneOuterAngle = 360
      panner.coneOuterGain = 0

      // Set position
      if (position instanceof THREE.Vector3) {
        panner.setPosition(position.x, position.y, position.z)
      } else {
        panner.setPosition(position.x || 0, position.y || 0, position.z || 0)
      }

      // Update listener position from camera
      this.updateListenerPosition()

      // Connect: source -> gain -> panner -> sfxGain
      source.connect(gain)
      gain.connect(panner)
      panner.connect(this.sfxGain)
    } else {
      // Non-spatial audio: source -> gain -> sfxGain
      source.connect(gain)
      gain.connect(this.sfxGain)
    }

    // Track active source
    const activeSound = {
      source,
      gain,
      panner,
      name,
      position,
      startTime: this.audioContext.currentTime
    }

    this.activeSources.push(activeSound)

    // Remove from active list when finished
    source.onended = () => {
      const index = this.activeSources.indexOf(activeSound)
      if (index > -1) {
        this.activeSources.splice(index, 1)
      }
    }

    // Start playback
    source.start(0)

    // Set rate limit timer
    this.timer[name] = soundData.rateLimit

    return activeSound
  }

  // Play background music with crossfade
  async playMusic(name, options = {}) {
    if (!this.audioContext) {
      await this.initialize()
    }

    // Already playing this music
    if (this.currentMusic === name && this.musicSource) {
      return
    }

    // Load new music
    if (!this.buffers[name]) {
      await this.load(name)
    }

    const buffer = this.buffers[name]
    if (!buffer) return

    const fadeDuration = options.fadeDuration || this.musicFadeDuration
    const fadeTime = fadeDuration / 1000 // Convert to seconds
    const currentTime = this.audioContext.currentTime

    // Fade out old music
    if (this.musicSource && !this.musicTransitioning) {
      this.musicTransitioning = true
      const oldGain = this.musicSource.gain

      oldGain.gain.setValueAtTime(oldGain.gain.value, currentTime)
      oldGain.gain.linearRampToValueAtTime(0, currentTime + fadeTime)

      // Stop old music after fade
      const oldSource = this.musicSource.source
      setTimeout(() => {
        try {
          oldSource.stop()
        } catch (e) {
          // Already stopped
        }
      }, fadeDuration)
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    // Create new music source
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.playbackRate.value = this.speed

    // Create gain for fade in
    const gain = this.audioContext.createGain()
    gain.gain.value = 0 // Start silent

    // Connect: source -> gain -> musicGain
    source.connect(gain)
    gain.connect(this.musicGain)

    // Start playback
    source.start(0)

    // Fade in new music
    gain.gain.setValueAtTime(0, currentTime)
    gain.gain.linearRampToValueAtTime(this.musicVolume, currentTime + fadeTime)

    // Update state
    this.musicSource = { source, gain }
    this.currentMusic = name

    setTimeout(() => {
      this.musicTransitioning = false
    }, fadeDuration)
  }

  // Stop music with fade out
  stopMusic(fadeDuration = null) {
    if (!this.musicSource) return

    const fadeTime = (fadeDuration || this.musicFadeDuration) / 1000
    const currentTime = this.audioContext.currentTime
    const gain = this.musicSource.gain

    gain.gain.setValueAtTime(gain.gain.value, currentTime)
    gain.gain.linearRampToValueAtTime(0, currentTime + fadeTime)

    const source = this.musicSource.source
    setTimeout(() => {
      try {
        source.stop()
      } catch (e) {
        // Already stopped
      }
      this.musicSource = null
      this.currentMusic = null
    }, fadeDuration || this.musicFadeDuration)
  }

  // Update listener position based on camera
  updateListenerPosition() {
    if (!this.camera || !this.audioContext.listener) return

    const listener = this.audioContext.listener

    // Set listener position
    if (listener.positionX) {
      // New API
      listener.positionX.value = this.camera.position.x
      listener.positionY.value = this.camera.position.y
      listener.positionZ.value = this.camera.position.z
    } else {
      // Deprecated API fallback
      listener.setPosition(
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z
      )
    }

    // Set listener orientation
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(this.camera.quaternion)
    const up = new THREE.Vector3(0, 1, 0)
    up.applyQuaternion(this.camera.quaternion)

    if (listener.forwardX) {
      // New API
      listener.forwardX.value = forward.x
      listener.forwardY.value = forward.y
      listener.forwardZ.value = forward.z
      listener.upX.value = up.x
      listener.upY.value = up.y
      listener.upZ.value = up.z
    } else {
      // Deprecated API fallback
      listener.setOrientation(
        forward.x, forward.y, forward.z,
        up.x, up.y, up.z
      )
    }
  }

  // Update all volumes
  updateVolumes() {
    if (!this.masterGain) return

    this.masterGain.gain.value = this.muted ? 0 : this.masterVolume
    this.sfxGain.gain.value = this.sfxVolume
    this.musicGain.gain.value = this.musicVolume
  }

  // Volume control methods
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    this.updateVolumes()
    this.saveSettings()
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    this.updateVolumes()
    this.saveSettings()
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    this.updateVolumes()
    this.saveSettings()
  }

  setMuted(muted) {
    this.muted = muted
    this.updateVolumes()
    this.saveSettings()
  }

  toggleMute() {
    this.setMuted(!this.muted)
  }

  // Legacy volume method for backwards compatibility
  setVolume(volume) {
    this.setMasterVolume(volume)
  }

  // Update method for rate limiting
  update(delta) {
    // Update rate limit timers
    for (const name in this.timer) {
      if (this.timer[name] > 0) {
        this.timer[name] = Math.max(0, this.timer[name] - delta)
      }
    }

    // Update listener position if camera is set
    if (this.camera && this.activeSources.length > 0) {
      this.updateListenerPosition()
    }
  }

  // Preload essential sounds
  async preloadSounds() {
    const soundList = [
      // Tower sounds
      { name: 'gattling.ogg', options: { spatial: true, rateLimit: 100 } },
      { name: 'missile.ogg', options: { spatial: true, rateLimit: 300 } },
      { name: 'laser.ogg', options: { spatial: true, rateLimit: 150 } },
      { name: 'sniper.ogg', options: { spatial: true, rateLimit: 500 } },
      { name: 'frost.ogg', options: { spatial: true, rateLimit: 400 } },
      { name: 'fire.ogg', options: { spatial: true, rateLimit: 200 } },
      { name: 'tesla.ogg', options: { spatial: true, rateLimit: 250 } },

      // Combat sounds
      { name: 'explosion.ogg', options: { spatial: true, rateLimit: 400 } },
      { name: 'impact.ogg', options: { spatial: true, rateLimit: 50 } },

      // Structure sounds
      { name: 'build.ogg', options: { spatial: true, rateLimit: 300 } },
      { name: 'upgrade.ogg', options: { spatial: true, rateLimit: 500 } },
      { name: 'destroy.ogg', options: { spatial: true, rateLimit: 300 } },

      // Enemy sounds
      { name: 'enemy_spawn.ogg', options: { spatial: true, rateLimit: 200 } },
      { name: 'enemy_death.ogg', options: { spatial: true, rateLimit: 100 } },
      { name: 'enemy_hit.ogg', options: { spatial: true, rateLimit: 50 } },

      // UI sounds
      { name: 'click.ogg', options: { spatial: false, rateLimit: 100 } },
      { name: 'hover.ogg', options: { spatial: false, rateLimit: 50 } },
      { name: 'coin.ogg', options: { spatial: false, rateLimit: 150 } },
      { name: 'xp.ogg', options: { spatial: false, rateLimit: 200 } },
      { name: 'wave_start.ogg', options: { spatial: false, rateLimit: 1000 } },
      { name: 'wave_complete.ogg', options: { spatial: false, rateLimit: 1000 } },
      { name: 'success.ogg', options: { spatial: false, rateLimit: 500 } },
      { name: 'error.ogg', options: { spatial: false, rateLimit: 500 } },
      { name: 'alert.ogg', options: { spatial: false, rateLimit: 2000 } },

      // Music
      { name: 'theme.ogg', options: { spatial: false, loop: true, rateLimit: 0 } },
      { name: 'combat.ogg', options: { spatial: false, loop: true, rateLimit: 0 } },
      { name: 'victory.ogg', options: { spatial: false, loop: false, rateLimit: 0 } },
      { name: 'defeat.ogg', options: { spatial: false, loop: false, rateLimit: 0 } }
    ]

    // Add all sounds to library
    soundList.forEach(({ name, options }) => {
      this.add(name, `/sounds/${name}`, options)
    })

    // Preload critical sounds (load others on-demand)
    const criticalSounds = [
      'gattling.ogg',
      'missile.ogg',
      'laser.ogg',
      'explosion.ogg',
      'click.ogg',
      'coin.ogg'
    ]

    await Promise.all(criticalSounds.map(name => this.load(name)))

    console.log('SoundManager: Essential sounds preloaded')
  }

  // Save settings to localStorage
  saveSettings() {
    const settings = {
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
      musicVolume: this.musicVolume,
      muted: this.muted
    }
    localStorage.setItem('soundSettings', JSON.stringify(settings))
  }

  // Load settings from localStorage
  loadSettings() {
    const saved = localStorage.getItem('soundSettings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        this.masterVolume = settings.masterVolume ?? 0.7
        this.sfxVolume = settings.sfxVolume ?? 0.8
        this.musicVolume = settings.musicVolume ?? 0.4
        this.muted = settings.muted ?? false
      } catch (e) {
        console.warn('Failed to load sound settings:', e)
      }
    }
  }

  // Stop all sounds
  stopAll() {
    this.activeSources.forEach(({ source }) => {
      try {
        source.stop()
      } catch (e) {
        // Already stopped
      }
    })
    this.activeSources = []
    this.stopMusic(0)
  }

  // Clean up
  destroy() {
    this.stopAll()
    if (this.audioContext) {
      this.audioContext.close()
    }
  }
}

export const SoundManager = new SoundManagerClass()
