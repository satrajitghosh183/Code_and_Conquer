import { createContext, useContext, useState, useEffect } from 'react'
import { getUserStats, updateUserStats } from '../services/api'
import { useAuth } from './AuthContext'

const GameContext = createContext({})

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

export const GameProvider = ({ children }) => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    coins: 0,
    xp: 0,
    level: 1,
    problemsSolved: 0,
    gamesPlayed: 0,
    wins: 0
  })
  const [loading, setLoading] = useState(true)
  const [powerUps, setPowerUps] = useState([])

  useEffect(() => {
    if (user) {
      loadStats()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadStats = async () => {
    if (!user) return
    try {
      const response = await getUserStats(user.id)
      setStats(response.data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const addRewards = async (rewards) => {
    if (!user) return

    const { coins, xp, powerUps: newPowerUps } = rewards

    try {
      await updateUserStats(user.id, {
        coins,
        xp,
        problemsSolved: 1
      })

    setStats(prev => ({
      ...prev,
      coins: prev.coins + coins,
      xp: prev.xp + xp,
      problemsSolved: prev.problemsSolved + 1,
      level: Math.floor((prev.xp + xp) / 100) + 1
    }))

    if (newPowerUps && newPowerUps.length > 0) {
      setPowerUps(prev => [...prev, ...newPowerUps])
    }
    } catch (error) {
      console.error('Error updating stats:', error)
    }
  }

  const spendCoins = async (amount) => {
    if (!user || stats.coins < amount) return false

    try {
      await updateUserStats(user.id, {
        coins: -amount
      })

      setStats(prev => ({
        ...prev,
        coins: prev.coins - amount
      }))

      return true
    } catch (error) {
      console.error('Error spending coins:', error)
      return false
    }
  }

  const addGameResult = async (won) => {
    if (!user) return

    try {
      await updateUserStats(user.id, {
        gamesPlayed: 1,
        wins: won ? 1 : 0
      })

      setStats(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        wins: prev.wins + (won ? 1 : 0)
      }))
    } catch (error) {
      console.error('Error updating game result:', error)
    }
  }

  const value = {
    stats,
    powerUps,
    loading,
    addRewards,
    spendCoins,
    addGameResult,
    refreshStats: loadStats
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

