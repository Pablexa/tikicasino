import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './useAuth.jsx'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setConnected(false)
      }
      return
    }

    const newSocket = io('/', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    newSocket.on('connect', () => {
      setConnected(true)
      console.log('Socket connected:', newSocket.id)
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
    })

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }, [user])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
