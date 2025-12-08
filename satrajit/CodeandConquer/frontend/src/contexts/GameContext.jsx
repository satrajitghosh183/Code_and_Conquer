import { createContext, useContext, useState, useEffect } from 'react'
import { getUserStats } from '../services/api'
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
      // Try API first
      const response = await getUserStats(user.id)
      const data = response.data
      
      // Map backend field names to frontend field names
      // Handle both direct data and nested data structure
      const statsData = data.data || data
      
      console.log('[GameContext] Loaded stats from API:', statsData)
      
      setStats({
        coins: statsData.coins || 0,
        xp: statsData.xp || 0,
        level: statsData.level || Math.floor((statsData.xp || 0) / 100) + 1,
        problemsSolved: statsData.problems_solved || statsData.problemsSolved || 0,
        gamesPlayed: statsData.games_played || statsData.gamesPlayed || 0,
        wins: statsData.wins || 0
      })
    } catch (error) {
      console.error('Error loading stats from API:', error)
      
      // Fallback: Try direct Supabase query
      try {
        const { supabase } = await import('../config/supabaseClient')
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (supabaseError) {
          console.error('Error loading stats from Supabase:', supabaseError)
          // If user_stats doesn't exist, try to create it
          if (supabaseError.code === 'PGRST116') {
            console.log('User stats not found, creating...')
            const { error: insertError } = await supabase
              .from('user_stats')
              .insert({
                id: user.id,
                coins: 0,
                xp: 0,
                level: 1,
                problems_solved: 0,
                games_played: 0,
                wins: 0
              })
            
            if (insertError) {
              console.error('Error creating user_stats:', insertError)
            } else {
              // Retry loading
              const { data: newData } = await supabase
                .from('user_stats')
                .select('*')
                .eq('id', user.id)
                .single()
              
              if (newData) {
                setStats({
                  coins: newData.coins || 0,
                  xp: newData.xp || 0,
                  level: newData.level || 1,
                  problemsSolved: newData.problems_solved || 0,
                  gamesPlayed: newData.games_played || 0,
                  wins: newData.wins || 0
                })
                return
              }
            }
          }
        } else if (supabaseData) {
          console.log('[GameContext] Loaded stats from Supabase:', supabaseData)
          setStats({
            coins: supabaseData.coins || 0,
            xp: supabaseData.xp || 0,
            level: supabaseData.level || 1,
            problemsSolved: supabaseData.problems_solved || 0,
            gamesPlayed: supabaseData.games_played || 0,
            wins: supabaseData.wins || 0
          })
          return
        }
      } catch (supabaseError) {
        console.error('Error in Supabase fallback:', supabaseError)
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Add rewards after successful submission
   * NOTE: The backend already updates the database stats in submissionController.js
   * This function ONLY updates local state and refreshes from server
   * DO NOT call updateUserStats API here - it would cause double-counting!
   */
  const addRewards = async (rewards) => {
    if (!user) return

    const { coins = 0, xp = 0, powerUps: newPowerUps } = rewards

    console.log('[GameContext] Adding rewards (local state only):', { coins, xp })

    // Update local state immediately for instant feedback
    setStats(prev => {
      const newXp = prev.xp + xp
      return {
        ...prev,
        coins: prev.coins + coins,
        xp: newXp,
        problemsSolved: prev.problemsSolved + 1,
        level: Math.floor(newXp / 100) + 1
      }
    })

    // Add power-ups if any
    if (newPowerUps && newPowerUps.length > 0) {
      setPowerUps(prev => [...prev, ...newPowerUps])
    }

    // Refresh stats from server to ensure consistency
    // (backend already updated the database)
    setTimeout(() => {
      loadStats()
    }, 1000)
  }

  /**
   * Spend coins (e.g., for purchasing items)
   * This DOES need to call the API since it's a user-initiated action
   */
  const spendCoins = async (amount) => {
    if (!user || stats.coins < amount) return false

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_URL}/users/${user.id}/stats/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coins: -amount })
      })

      if (response.ok) {
        setStats(prev => ({
          ...prev,
          coins: prev.coins - amount
        }))
        return true
      }
      return false
    } catch (error) {
      console.error('Error spending coins:', error)
      return false
    }
  }

  /**
   * Add game result (win/loss)
   * This DOES need to call the API since it's recording a game outcome
   */
  const addGameResult = async (won) => {
    if (!user) return

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      await fetch(`${API_URL}/users/${user.id}/stats/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gamesPlayed: 1,
          wins: won ? 1 : 0
        })
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
