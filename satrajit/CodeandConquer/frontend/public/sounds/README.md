# Code and Conquer - Sound Effects Guide

This document lists all required sound effects for the game's enhanced audio system.

## 🎵 Current Sound Files (Existing)
- ✅ `gattling.ogg` - Gattling tower firing
- ✅ `missile.ogg` - Missile tower launch
- ✅ `laser.ogg` - Laser tower beam
- ✅ `explosion.ogg` - General explosion
- ✅ `theme.ogg` - Main menu theme music

## 🔊 Required Sound Effects (To Add)

### Tower Sounds

#### Attack Sounds
- ❌ `sniper.ogg` - Single powerful rifle shot + brass casing drop (500-800ms)
- ❌ `frost.ogg` - Ice crack + freezing wind whoosh (400-600ms)
- ❌ `fire.ogg` - Flame thrower roar + crackling fire (300-500ms)
- ❌ `tesla.ogg` - Electric crackle + lightning zap (250-400ms)

#### Structure Sounds
- ❌ `build.ogg` - Construction/hammer sound when tower is placed (600-900ms)
- ❌ `upgrade.ogg` - Power-up/level-up chime when tower upgrades (800-1200ms)
- ❌ `destroy.ogg` - Explosion + metal debris when tower destroyed (1000-1500ms)

### Enemy Sounds
- ❌ `enemy_spawn.ogg` - Portal/teleport whoosh when enemy spawns (400-600ms)
- ❌ `enemy_death.ogg` - Explosion/collapse when enemy dies (300-500ms)
- ❌ `enemy_hit.ogg` - Impact/grunt when enemy takes damage (100-200ms)

### Combat Sounds
- ❌ `impact.ogg` - Projectile hit sound (hit flesh/armor) (50-150ms)

### UI Sounds (Non-spatial)
- ❌ `click.ogg` - Button click (50-100ms)
- ❌ `hover.ogg` - Button hover subtle whoosh (30-80ms)
- ❌ `coin.ogg` - Coin/gold collected sound (200-400ms)
- ❌ `xp.ogg` - Experience gained chime (300-500ms)
- ❌ `wave_start.ogg` - Warning horn/alarm when wave starts (800-1200ms)
- ❌ `wave_complete.ogg` - Victory fanfare when wave completes (1500-2000ms)
- ❌ `success.ogg` - Problem solved success chime (600-900ms)
- ❌ `error.ogg` - Submission failed error buzz (400-600ms)
- ❌ `alert.ogg` - Base damage alert siren (1000-1500ms)

### Music (Looping)
- ❌ `combat.ogg` - Intense action music during waves (2-3 minute loop)
- ❌ `victory.ogg` - Triumphant fanfare on game win (10-15 seconds, one-shot)
- ❌ `defeat.ogg` - Somber game over theme (10-15 seconds, one-shot)

## 🎨 Sound Design Guidelines

### Technical Specifications
- **Format**: OGG Vorbis (best browser compatibility)
- **Sample Rate**: 44100 Hz
- **Bit Rate**: 128-192 kbps
- **Channels**: Mono (spatial audio works better with mono sources)

### Audio Characteristics

#### Tower Sounds (Spatial)
- Clear attack start (first 50ms)
- Distinct per tower type
- Not too repetitive (subtle variations)
- Volume: -6dB to -12dB peak

#### Enemy Sounds (Spatial)
- Lightweight (frequent playback)
- Distinct from friendly sounds
- Volume: -12dB to -18dB peak

#### UI Sounds (Non-spatial)
- Sharp, satisfying clicks
- Clear feedback
- Short duration
- Volume: -10dB to -15dB peak

#### Music
- Seamless loops (fade in/out at loop points)
- Layered instrumentation
- Dynamic range compression
- Volume: -18dB to -24dB peak (quieter than SFX)

## 🔧 Temporary Placeholders

Until custom sounds are created, you can:

1. **Use placeholder sounds** from free sound libraries:
   - [Freesound.org](https://freesound.org/)
   - [OpenGameArt.org](https://opengameart.org/)
   - [Zapsplat.com](https://www.zapsplat.com/)

2. **Generate simple tones** using Audacity:
   - Generate > Tone > choose frequency
   - Apply envelope for attack/decay
   - Export as OGG

3. **Use existing sounds as placeholders**:
   - `sniper.ogg` → use `gattling.ogg` (louder, slower)
   - `frost.ogg` → use `laser.ogg` (pitch shifted down)
   - `fire.ogg` → use `explosion.ogg` (looped short)
   - `tesla.ogg` → use `laser.ogg` (pitch shifted up)
   - `click.ogg` → short burst of white noise
   - `coin.ogg` → high-pitched ding
   - All other UI sounds → variations of existing sounds

## 🎯 Integration Status

### ✅ Integrated
- Gattling tower firing (spatial 3D)
- Missile tower launch (spatial 3D)
- Laser tower beam (spatial 3D)
- Explosion effects (spatial 3D)
- Wave start sound (UI)
- Theme music (background, crossfade ready)

### 🔄 Partially Integrated
- Tower attack sounds (code ready, waiting for audio files)
- Enemy sounds (Enemy.js needs update)
- Structure sounds (needs integration)

### ❌ Not Yet Integrated
- UI sounds in React components
- Dynamic music system (combat/victory/defeat)
- Power-up collection sounds
- Achievement unlock sounds

## 📊 Sound Manager Features

### Spatial Audio (3D Positional)
- Sounds come from direction of action
- Volume decreases with distance
- Panning (left/right speakers)
- HRTF (Head-Related Transfer Function) for realism

### Volume Control
- Master volume
- SFX volume (separate from music)
- Music volume
- Mute toggle
- Settings persist in localStorage

### Performance
- Sound pooling (reuse audio nodes)
- Rate limiting (prevent sound spam)
- On-demand loading (critical sounds preloaded)
- Automatic cleanup

### Music System
- Crossfading between tracks (2-second fade)
- Seamless looping
- Dynamic switching based on game state
- Independent volume control

## 🚀 Next Steps

1. **Phase 1: Create/Source Placeholder Sounds**
   - Download free sounds or generate simple tones
   - Convert to OGG format
   - Place in `/public/sounds/` directory

2. **Phase 2: Integrate Enemy Sounds**
   - Update Enemy.js to play spawn/hit/death sounds
   - Add spatial audio to enemy positions

3. **Phase 3: Integrate Structure Sounds**
   - Add build sound when placing towers
   - Add upgrade sound with visual effect
   - Add destroy sound on tower death

4. **Phase 4: Add UI Sounds**
   - Update BuildBar.jsx for click/hover sounds
   - Add coin sound when gold increases
   - Add success/error sounds in CodingConsole.jsx

5. **Phase 5: Dynamic Music**
   - Implement game state music switching
   - Add combat music during waves
   - Add victory/defeat music on game end

6. **Phase 6: Audio Settings UI**
   - Create AudioSettings.jsx component
   - Add volume sliders
   - Add mute toggle
   - Wire up to SoundManager

## 📝 Notes

- All spatial sounds use the camera position as listener
- Rate limiting prevents sound spam (e.g., gattling limited to 10 shots/sec)
- Web Audio API requires user interaction to start (handled in initializeSoundSystem)
- Sound settings are saved to localStorage and persist between sessions
- Missing sound files will log warnings but won't crash the game
