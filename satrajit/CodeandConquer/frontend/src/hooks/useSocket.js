import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export function useSocket(url = null) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const urlRef = useRef(url || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000')

  useEffect(() => {
    const socketInstance = io(urlRef.current, {
      transports: ['websocket', 'polling']
    })

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id)
      setConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected')
      setConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.close()
    }
  }, [])

  return { socket, connected }
}

