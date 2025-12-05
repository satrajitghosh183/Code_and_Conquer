/**
 * Oversees wave composition and lane selection for single-player.
 * Reacts to player performance and tower placement to keep pressure interesting.
 */
export class AIDirector {
  constructor(game, pathManager) {
    this.game = game
    this.pathManager = pathManager
    this.difficultyFactor = 1
    this.playerMomentum = 0
    this.recentDamage = []
    this.recentLivesLost = 0
  }

  recordWaveOutcome({ livesLost = 0, completionTime = 0 }) {
    this.recentLivesLost = livesLost
    this.recentDamage.push(livesLost)
    if (this.recentDamage.length > 5) this.recentDamage.shift()

    // Adjust difficulty based on how many lives were lost
    if (livesLost === 0) {
      this.difficultyFactor = Math.min(1.5, this.difficultyFactor + 0.05)
    } else {
      this.difficultyFactor = Math.max(0.9, this.difficultyFactor - 0.03 * livesLost)
    }
  }

  getWeakPaths() {
    if (!this.pathManager) return []
    return this.pathManager.getWeakestPaths(this.game.towers || [])
  }

  planWave(waveNumber) {
    const weakPaths = this.getWeakPaths()
    const forceProbe = (waveNumber % 3 === 0) && weakPaths.length > 0
    const baseScale = 1 + (waveNumber - 1) * 0.12
    const scale = baseScale * this.difficultyFactor

    // Composition templates
    let groups = []
    if (waveNumber % 10 === 0) {
      groups = [
        { type: 'boss', count: 1, formation: 'vFormation', delay: 1600 },
        { type: 'healer', count: 2, formation: 'line', delay: 900 },
        { type: 'armored', count: 4, formation: 'line', delay: 900 }
      ]
    } else if (waveNumber % 5 === 0) {
      groups = [
        { type: 'boss', count: 1, formation: 'vFormation', delay: 1500 },
        { type: 'armored', count: 3, formation: 'vFormation', delay: 900 }
      ]
    } else if (waveNumber % 4 === 0) {
      groups = [
        { type: 'swarm', count: 22, formation: 'swarm', delay: 260 },
        { type: 'scout', count: 8, formation: 'pincer', delay: 400 }
      ]
    } else if (waveNumber % 3 === 0) {
      groups = [
        { type: 'brute', count: 3, formation: 'line', delay: 1000 },
        { type: 'armored', count: 2, formation: 'vFormation', delay: 1100 },
        { type: 'scout', count: 6, formation: 'circle', delay: 600 }
      ]
    } else {
      groups = [
        { type: 'spider', count: 8, formation: 'line', delay: 750 },
        { type: 'scout', count: 4, formation: 'vFormation', delay: 700 },
        { type: 'brute', count: 1, formation: 'line', delay: 1100 }
      ]
    }

    // Scale counts and attach path preferences
    const pathChoices = weakPaths.length > 0 ? weakPaths : (this.pathManager?.getAllPathIds() || [])
    const plannedGroups = groups.map((g, idx) => {
      const scaledCount = Math.ceil(g.count * scale)
      const pathId = forceProbe && idx === 0
        ? weakPaths[Math.floor(Math.random() * weakPaths.length)]
        : null
      return {
        ...g,
        count: scaledCount,
        pathId,
        pathChoices,
        delay: g.delay || 900
      }
    })

    const totalEnemies = plannedGroups.reduce((sum, g) => sum + g.count, 0)

    return {
      number: waveNumber,
      groups: plannedGroups,
      totalEnemies
    }
  }
}

export default AIDirector

