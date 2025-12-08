import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
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
  // Unified gold state - this is the single source of truth for gold
  const [gold, setGold] = useState(0)
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
  
  // Track pending gold changes to sync to backend periodically
  const pendingGoldSync = useRef(null)
  const lastSyncedGold = useRef(0)
  const goldChangeListeners = useRef(new Set())

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
      console.log(`[GameContext] Loading stats for user: ${user.id}`)
      const response = await getUserStats(user.id)
      console.log('[GameContext] Raw axios response:', response)
      
      // Axios wraps the response in .data
      const data = response.data
      console.log('[GameContext] Response.data:', data)
      
      // The backend returns the stats directly, not nested
      const statsData = data
      
      console.log('[GameContext] Parsed statsData:', statsData)
      console.log('[GameContext] Coins value:', statsData?.coins, 'Type:', typeof statsData?.coins)
      
      const coins = parseInt(statsData?.coins) || 0
      const xp = parseInt(statsData?.xp) || 0
      
      console.log('[GameContext] Final parsed values - Coins:', coins, 'XP:', xp)
      
      // Update both stats and unified gold state
      setGold(coins)
      lastSyncedGold.current = coins
      
      setStats({
        coins: coins,
        xp: xp,
        level: parseInt(statsData?.level) || Math.floor(xp / 100) + 1,
        problemsSolved: parseInt(statsData?.problems_solved) || parseInt(statsData?.problemsSolved) || 0,
        gamesPlayed: parseInt(statsData?.games_played) || parseInt(statsData?.gamesPlayed) || 0,
        wins: parseInt(statsData?.wins) || 0
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
                const newCoins = newData.coins || 0
                setGold(newCoins)
                lastSyncedGold.current = newCoins
                setStats({
                  coins: newCoins,
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
          console.log('[GameContext] Supabase coins:', supabaseData.coins, 'Type:', typeof supabaseData.coins)
          
          const coins = parseInt(supabaseData.coins) || 0
          const xp = parseInt(supabaseData.xp) || 0
          
          console.log('[GameContext] Parsed Supabase values - Coins:', coins, 'XP:', xp)
          
          // Update both stats and unified gold state
          setGold(coins)
          lastSyncedGold.current = coins
          
          setStats({
            coins: coins,
            xp: xp,
            level: parseInt(supabaseData.level) || 1,
            problemsSolved: parseInt(supabaseData.problems_solved) || 0,
            gamesPlayed: parseInt(supabaseData.games_played) || 0,
            wins: parseInt(supabaseData.wins) || 0
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

  // Update gold locally (instant, no API call)
  const updateGoldLocal = useCallback((newGold) => {
    console.log('[GameContext] Updating gold locally:', newGold)
    setGold(newGold)
    // Also update stats.coins to keep them in sync
    setStats(prev => ({ ...prev, coins: newGold }))
    // Notify all listeners
    goldChangeListeners.current.forEach(listener => listener(newGold))
  }, [])

  // Add gold (relative change, instant)
  const addGold = useCallback((amount) => {
    console.log('[GameContext] Adding gold:', amount)
    setGold(prev => {
      const newGold = prev + amount
      // Also update stats.coins
      setStats(s => ({ ...s, coins: newGold }))
      // Notify listeners
      goldChangeListeners.current.forEach(listener => listener(newGold))
      return newGold
    })
  }, [])

  // Deduct gold (relative change, instant)
  const deductGold = useCallback((amount) => {
    console.log('[GameContext] Deducting gold:', amount)
    setGold(prev => {
      const newGold = Math.max(0, prev - amount)
      // Also update stats.coins
      setStats(s => ({ ...s, coins: newGold }))
      // Notify listeners
      goldChangeListeners.current.forEach(listener => listener(newGold))
      return newGold
    })
  }, [])

  // Subscribe to gold changes (for components that need to react to gold updates)
  const subscribeToGoldChanges = useCallback((listener) => {
    goldChangeListeners.current.add(listener)
    return () => goldChangeListeners.current.delete(listener)
  }, [])

  // Sync gold to backend (call this periodically or on important events)
  const syncGoldToBackend = useCallback(async () => {
    if (!user) return
    const currentGold = gold
    if (currentGold === lastSyncedGold.current) return // No change
    
    const goldDiff = currentGold - lastSyncedGold.current
    console.log('[GameContext] Syncing gold to backend. Diff:', goldDiff)
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      await fetch(`${API_URL}/users/${user.id}/stats/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coins: goldDiff })
      })
      lastSyncedGold.current = currentGold
      console.log('[GameContext] Gold synced successfully')
    } catch (error) {
      console.error('[GameContext] Error syncing gold:', error)
    }
  }, [user, gold])

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

  // Force refresh stats (useful for debugging)
  const forceRefreshStats = async () => {
    console.log('[GameContext] Force refreshing stats...')
    setLoading(true)
    await loadStats()
  }

  // Sync gold to backend periodically (every 30 seconds if there are changes)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (user && gold !== lastSyncedGold.current) {
        syncGoldToBackend()
      }
    }, 30000)
    
    // Also sync on page unload
    const handleUnload = () => {
      if (user && gold !== lastSyncedGold.current) {
        // Use sendBeacon for reliable unload sync
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const goldDiff = gold - lastSyncedGold.current
        navigator.sendBeacon(
          `${API_URL}/users/${user.id}/stats/update`,
          JSON.stringify({ coins: goldDiff })
        )
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    
    return () => {
      clearInterval(syncInterval)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [user, gold, syncGoldToBackend])

  const value = {
    stats,
    // Unified gold state - use this instead of stats.coins
    gold,
    powerUps,
    loading,
    addRewards,
    spendCoins,
    addGameResult,
    refreshStats: loadStats,
    forceRefreshStats,
    // New gold management functions
    updateGoldLocal,
    addGold,
    deductGold,
    subscribeToGoldChanges,
    syncGoldToBackend
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}
