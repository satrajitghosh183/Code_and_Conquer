import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext({})

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [matchData, setMatchData] = useState(null)
  const socketRef = useRef(null)
  
  const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id) return
    
    // Create socket if not exists
    if (!socketRef.current) {
      console.log('SocketContext: Creating new socket connection...')
      
      const newSocket = io(API_URL, {
        auth: { userId: user.id },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })

      newSocket.on('connect', () => {
        console.log('SocketContext: Connected:', newSocket.id)
        setConnected(true)
      })

      newSocket.on('disconnect', (reason) => {
        console.log('SocketContext: Disconnected:', reason)
        setConnected(false)
      })

      newSocket.on('connect_error', (err) => {
        console.error('SocketContext: Connection error:', err.message)
        setConnected(false)
      })
      
      // Match events - store match data centrally
      newSocket.on('match_found', (data) => {
        console.log('SocketContext: Match found:', data)
        setMatchData({
          matchId: data.matchId,
          opponent: data.opponent,
          gameState: data.gameState,
          status: 'found'
        })
      })
      
      newSocket.on('match_briefing', (match) => {
        console.log('SocketContext: Match briefing:', match)
        setMatchData(prev => ({
          ...prev,
          ...match,
          status: 'briefing'
        }))
      })
      
      newSocket.on('match_started', (match) => {
        console.log('SocketContext: Match started:', match)
        setMatchData(prev => ({
          ...prev,
          ...match,
          status: 'started'
        }))
      })
      
      newSocket.on('match_cancelled', () => {
        console.log('SocketContext: Match cancelled')
        setMatchData(null)
      })
      
      newSocket.on('match_ended', (data) => {
        console.log('SocketContext: Match ended:', data)
        setMatchData(prev => ({
          ...prev,
          ...data,
          status: 'ended'
        }))
      })

      socketRef.current = newSocket
      setSocket(newSocket)
    }

    return () => {
      // Don't disconnect on every re-render, only when user logs out
    }
  }, [user?.id, API_URL])

  // Cleanup on user logout
  useEffect(() => {
    if (!user && socketRef.current) {
      console.log('SocketContext: User logged out, disconnecting socket')
      socketRef.current.close()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
      setMatchData(null)
    }
  }, [user])

  // Join matchmaking queue
  const joinQueue = useCallback((playerData) => {
    if (!socketRef.current?.connected || !user?.id) {
      console.error('Cannot join queue: not connected or no user')
      return false
    }
    
    socketRef.current.emit('join_queue', {
      id: user.id,
      ...playerData
    })
    
    return true
  }, [user?.id])

  // Leave matchmaking queue
  const leaveQueue = useCallback(() => {
    if (!socketRef.current || !user?.id) return
    
    socketRef.current.emit('leave_queue', { id: user.id })
  }, [user?.id])

  // Join an existing match room
  const joinMatch = useCallback((matchId) => {
    if (!socketRef.current?.connected) {
      console.error('Cannot join match: not connected')
      return false
    }
    
    console.log('SocketContext: Joining match room:', matchId)
    socketRef.current.emit('join_match', matchId)
    return true
  }, [])

  // Start match (triggers countdown)
  const startMatch = useCallback((matchId) => {
    if (!socketRef.current?.connected) {
      console.error('Cannot start match: not connected')
      return false
    }
    
    console.log('SocketContext: Starting match:', matchId)
    socketRef.current.emit('start_match', matchId)
    return true
  }, [])

  // Clear match data
  const clearMatchData = useCallback(() => {
    setMatchData(null)
  }, [])

  const value = {
    socket,
    connected,
    matchData,
    joinQueue,
    leaveQueue,
    joinMatch,
    startMatch,
    clearMatchData
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export default SocketContext

