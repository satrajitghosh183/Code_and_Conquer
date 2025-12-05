import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'

/**
 * Custom hook for multiplayer game functionality
 * Handles connection, matchmaking, state sync, and actions
 */
export function useMultiplayer() {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [inQueue, setInQueue] = useState(false)
  const [currentMatch, setCurrentMatch] = useState(null)
  const [matchState, setMatchState] = useState(null)
  const [lastSequence, setLastSequence] = useState(-1)
  
  const socketRef = useRef(null)
  const syncIntervalRef = useRef(null)
  const pingIntervalRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id) return

    const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
    
    const socketInstance = io(API_URL, {
      auth: {
        userId: user.id
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts
    })

    socketRef.current = socketInstance
    setSocket(socketInstance)

    // Connection handlers
    socketInstance.on('connect', () => {
      console.log('[Multiplayer] Connected:', socketInstance.id)
      setConnected(true)
      reconnectAttempts.current = 0
      
      // Rejoin match if was in one
      if (currentMatch?.id) {
        socketInstance.emit('join_match', currentMatch.id)
        requestStateSync(currentMatch.id, -1) // Request full state
      }
    })

    socketInstance.on('disconnect', (reason) => {
      console.log('[Multiplayer] Disconnected:', reason)
      setConnected(false)
      
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        socketInstance.connect()
      }
    })

    socketInstance.on('connect_error', (error) => {
      console.error('[Multiplayer] Connection error:', error)
      reconnectAttempts.current++
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('[Multiplayer] Max reconnection attempts reached')
      }
    })

    // Matchmaking handlers
    socketInstance.on('match_found', (data) => {
      console.log('[Multiplayer] Match found:', data)
      setCurrentMatch({
        id: data.matchId,
        opponent: data.opponent,
        state: 'waiting'
      })
      socketInstance.emit('join_match', data.matchId)
    })

    socketInstance.on('queue_update', (data) => {
      console.log('[Multiplayer] Queue update:', data.queueSize)
    })

    socketInstance.on('queue_error', (error) => {
      console.error('[Multiplayer] Queue error:', error)
      setInQueue(false)
    })

    // Match state handlers
    socketInstance.on('match_briefing', (match) => {
      console.log('[Multiplayer] Match briefing:', match)
      setCurrentMatch(match)
      setMatchState(match.gameState)
    })

    socketInstance.on('match_started', (match) => {
      console.log('[Multiplayer] Match started:', match)
      setCurrentMatch(match)
      setMatchState(match.gameState)
      startStateSync(match.id)
    })

    socketInstance.on('game_state_update', (state) => {
      setMatchState(state)
      if (state.updateSequence) {
        setLastSequence(state.updateSequence)
      }
    })

    socketInstance.on('state_sync', (state) => {
      console.log('[Multiplayer] State synced:', state)
      setMatchState(state.gameState)
      if (state.updateSequence) {
        setLastSequence(state.updateSequence)
      }
    })

    // Action handlers
    socketInstance.on('action_confirmed', (data) => {
      console.log('[Multiplayer] Action confirmed:', data)
    })

    socketInstance.on('action_error', (error) => {
      console.error('[Multiplayer] Action error:', error)
    })

    // Coding handlers
    socketInstance.on('coding_result', (result) => {
      console.log('[Multiplayer] Coding result:', result)
    })

    socketInstance.on('coding_error', (error) => {
      console.error('[Multiplayer] Coding error:', error)
    })

    // Ping handler
    socketInstance.on('pong', (data) => {
      // Connection is alive
    })

    // Cleanup
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
      socketInstance.close()
    }
  }, [user?.id])

  // Start state synchronization
  const startStateSync = useCallback((matchId) => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
    }

    syncIntervalRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('sync_state', {
          matchId,
          playerId: user?.id,
          lastSequence
        })
      }
    }, 1000) // Sync every second

    // Start ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }

    pingIntervalRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.connected && currentMatch?.id) {
        socketRef.current.emit('ping', {
          matchId: currentMatch.id,
          playerId: user?.id
        })
      }
    }, 5000) // Ping every 5 seconds
  }, [user?.id, lastSequence, currentMatch?.id])

  // Request state sync
  const requestStateSync = useCallback((matchId, sequence = -1) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('sync_state', {
        matchId,
        playerId: user?.id,
        lastSequence: sequence
      })
    }
  }, [user?.id])

  // Join matchmaking queue
  const joinQueue = useCallback((playerData = {}) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.error('[Multiplayer] Not connected')
      return
    }

    const data = {
      id: user?.id,
      username: user?.email?.split('@')[0] || 'Player',
      level: 1,
      ...playerData
    }

    socketRef.current.emit('join_queue', data)
    setInQueue(true)
  }, [user])

  // Leave queue
  const leaveQueue = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave_queue', { id: user?.id })
    }
    setInQueue(false)
  }, [user?.id])

  // Send player action
  const sendAction = useCallback((action) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.error('[Multiplayer] Not connected')
      return false
    }

    if (!currentMatch?.id) {
      console.error('[Multiplayer] Not in a match')
      return false
    }

    socketRef.current.emit('player_action', {
      matchId: currentMatch.id,
      playerId: user?.id,
      action
    })

    return true
  }, [currentMatch?.id, user?.id])

  // Place tower
  const placeTower = useCallback((position, towerType) => {
    return sendAction({
      type: 'place_tower',
      data: { position, towerType }
    })
  }, [sendAction])

  // Deploy unit
  const deployUnit = useCallback((unitType, position) => {
    return sendAction({
      type: 'deploy_unit',
      data: { unitType, position }
    })
  }, [sendAction])

  // Upgrade tower
  const upgradeTower = useCallback((towerId) => {
    return sendAction({
      type: 'upgrade_tower',
      data: { towerId }
    })
  }, [sendAction])

  // Use ability
  const useAbility = useCallback((abilityType, target = null) => {
    return sendAction({
      type: 'use_ability',
      data: { abilityType, target }
    })
  }, [sendAction])

  // Submit code
  const submitCode = useCallback((code, problemId, difficulty, language = 'javascript') => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.error('[Multiplayer] Not connected')
      return false
    }

    if (!currentMatch?.id) {
      console.error('[Multiplayer] Not in a match')
      return false
    }

    socketRef.current.emit('submit_code', {
      matchId: currentMatch.id,
      playerId: user?.id,
      code,
      problemId,
      difficulty,
      language
    })

    return true
  }, [currentMatch?.id, user?.id])

  return {
    // Connection state
    socket,
    connected,
    inQueue,
    
    // Match state
    currentMatch,
    matchState,
    lastSequence,
    
    // Actions
    joinQueue,
    leaveQueue,
    sendAction,
    placeTower,
    deployUnit,
    upgradeTower,
    useAbility,
    submitCode,
    requestStateSync
  }
}

